var express = require('express');
var multiparty = require('multiparty');
var AWS = require('aws-sdk');

var s3 = require('../config/aws').s3;
var User = require('../models/user');
var Project = require('../models/project');
var CustomImage = require('../models/customImage');

var router = express.Router({mergeParams: true});


// get all custom images for the user
// !!! TODO: need to restrict the access of this project for other users
router.get('/', function(req, res) {
  Project.findOne({
    _id: req.params.project_id
  }, function(err, project) {
    if (!project){
      res.json({ success: false, message: 'no project was found with the given id.'});
    } else{
      res.json({ success: true, message: 'custom images found', customImages: project.customImages});
    }
  });
});


// upload an user submitted image to S3
// !!! TODO: need to restrict the access of this project for other users
router.post('/', function(req, res) {
  Project.findOne({
    _id: req.params.project_id
  }, function(err, project) {
    if (!project){
      res.json({ success: false, message: 'no project was found with the given id.'});
    } else{
      // create a custom image doc 
      var newCustomImage = new CustomImage();
      newCustomImage.save(function(err) {
        if (err) throw err;
      });

      // parse multi-part/form-data
      var form = new multiparty.Form();
      form.on('field', function(name, value) {
        if (name === 'path') {
          destPath = value;
        }
      });
      form.on('part', function(part) {
        s3.putObject({
          Bucket: s3['bucketName']+'/customImages',
          Key: newCustomImage.id,
          ACL: 'public-read-write',
          Body: part,
          ContentLength: part.byteCount
        }, function(err, data) {
          if (err) throw err;
          // console.log("done", data); // eTag
          res.end("OK");
        });
      });
      form.parse(req);

      // add new customImage to the project
      project.customImages.push(newCustomImage);
      project.save(function(err) {
        if (err) throw err;
      });

      res.json({ success: true, message: 'custom images created', customImages: newCustomImage});
    }
  });
});


// get custome image(id)
// !!! TODO: need to restrict the access of this project for other users
router.get('/:custom_id', function(req, res) {
  CustomImage.findOne({
    _id: req.params.custom_id
  }, function(err, customImage) {
    if (!customImage){
      res.json({ success: false, message: 'no custom image was found with the given id.'});
    } else{
      // get object and pipe it to the client
      s3.getObject({
        Bucket: s3['bucketName']+'/customImages',
        Key: customImage.id
      }, function(err, data){
        if (err) console.log(err, err.stack); // an error occurred
        else {
          var stream = AWS.util.buffer.toStream(data.Body);
          stream.pipe(res);
        }
      });
    }
  });
}); 

module.exports = router;
