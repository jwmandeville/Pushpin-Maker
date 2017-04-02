'use strict'

import React, {Component, PropTypes} from 'react';
import {connect} from 'react-redux';
import {fabric} from 'fabric-webpack'
import $ from 'jquery'
import {treeAdd,previewImage, imageBroughtUp, imageSentDown, imageDeleted, canvasCleared, textAdd, freehandAdd,imageRendered,imageAddedJson,saveLayerTree,loadLayerTree} from '../actions'
import { SketchPicker } from 'react-color';
import Slider, { Range } from 'rc-slider'
import Modal from 'react-modal';
import LayerTree from '../containers/layerTree'
import SizeSlider from '../containers/slider'
import server from '../config/server';
import ReactTooltip from 'react-tooltip';

var width = $(window).width();
var height = $(window).height();
var cHex;
var p_cHex;
var showPicker = false;
var freeText = "Enter Freehand Draw";
var stateTest;
var colorMode;
var alpha;
var rgb;
var color_code = 0;

function saveCanvasJSON(json,project,key){
    var canvasEndPoint = server+"/api/projects/"+project+"/renderedImages/canvas/"+key
    $.ajax({
        url:canvasEndPoint,
        type: "PUT",
        xhrFields: {
            withCredentials: true
                },
        data :{
            canvas:json
        },
        crossDomain:true,
        success: function(data){
            if (data.success == true){
                console.log("Json Saved");
            }else{
                alert("Error saving Serialized Canvas " + data.message)
            }
        }
    })
    .fail(
      function() { alert("ajax failure"); return false;}
     );
}

function canvasToImage(ctx,canvas,size){   
    canvas.setActiveGroup(new fabric.Group(canvas.getObjects())).renderAll();
    var group = canvas.getActiveGroup();
    var br = group.getBoundingRect();
    canvas.discardActiveGroup().renderAll();

    
    var params = {multiplier:0,left:br.left,top:br.top, width:br.width, height:br.height};
    if(br.left < 0){
        params.left = 0;
        params.width = br.left + br.width;
    }
    if(br.top<0){
        params.top = 0;
        params.height = br.top+br.height;
    }
    if(br.left + br.width> canvas.width){
        params.width = canvas.width-br.width;
    }
    if(Math.abs(br.top + br.height)> canvas.height ){
        params.height = canvas.height-br.height;
    }
    var mult;
    if(params.width > params.height){
        mult = size/params.width;
    }else{
        mult = size/params.height;
    }
    params.multiplier = mult;

    var dataUrl = canvas.toDataURL(params);        

    var img = new Image();
    img.src = dataUrl;
    img.width = params.width;
    img.height = params.height;
    return img;     
}
    const customStyles = {      
          overlay : {
            backgroundColor   : 'rgba(0, 0, 0, 0.5)'
          },
          content : {
            margin: '15% auto',
            left:'300',
            right:'490',
            width: '30%',
            height:'30%',
            background: '#fefefe',
            overflow : 'hiddden',
            padding:'0px',
          }
      
    };


const customPalleteStyles = {
          overlay : {
            backgroundColor   : 'rgba(0, 0, 0, 0.5)'
          },
          content : {
            margin: '15% auto',
            left:'300',
            right:'490',
            width: '40%',
            height:'50%',
            background: '#fefefe',
            overflow : 'hiddden',
            padding:'0px',
          }

    };


var pallete = [
    "#F44336",
    "#2196F3",
    "#8BC34A",
    "#FF5722",
    "#FFEB3B",
    "#9E9E9E"
    ]

var previewURLs = []


class FabricCanvas extends Component {
	constructor(props){
		super(props);
        this.state = {
            modalIsOpen:false,
            range:[25,75],
            canvas : null,
            text: "Freehand On",
            image_number: 0,
            selection: -1,
            colorModalIsOpen:false,
            freehandColor: 'transparent',
            colorList: pallete.map((color)=><button value={pallete.indexOf(color)} onClick = {()=>this.deleteColor(pallete.indexOf(color))} style = {{height: 20, width: 20, backgroundColor:color }}></button>),
            previewList: previewURLs.map((url)=><img src={url} style={{padding: 6}} onClick = {()=>this.deletePreview(previewURLs.indexOf(url))}/>)
        };
        
        this.openModal = this.openModal.bind(this);
        this.closeModal = this.closeModal.bind(this);
        this.onRangeChange = this.onRangeChange.bind(this);        
        this.shouldComponentUpdate = this.shouldComponentUpdate.bind(this);
        this.previewClicked = this.previewClicked.bind(this);
        this.saveButton = this.saveButton.bind(this);
        this.drawImage = this.drawImage.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.moveObjectForward = this.moveObjectForward.bind(this);
        this.moveObjectBackward = this.moveObjectBackward.bind(this);
        this.deleteActiveObject = this.deleteActiveObject.bind(this);
        this.addText = this.addText.bind(this);
        this.selectColor = this.selectColor.bind(this);
        this.setHalo = this.setHalo.bind(this);
        this.enterDrawingMode = this.enterDrawingMode.bind(this);
        this.choose = this.choose.bind(this);
        this.chooseColor = this.chooseColor.bind(this);
        this.saveGroup = this.saveGroup.bind(this);
        this.selectObject = this.selectObject.bind(this);
        this.clearCanvas = this.clearCanvas.bind(this);
        this.removeWhiteSpace = this.removeWhiteSpace.bind(this);
        this.tryAnotherColor = this.tryAnotherColor.bind(this);
        this.getProjects = this.getProjects.bind(this);
        this.addJsonToCanvas = this.addJsonToCanvas.bind(this);
        this.saveRenderedCanvas = this.saveRenderedCanvas.bind(this);
        this.addFreehand = this.addFreehand.bind(this);
        this.addColor = this.addColor.bind(this);
        this.deleteColor = this.deleteColor.bind(this);
        this.openColorModal = this.openColorModal.bind(this);
        this.closeColorModal = this.closeColorModal.bind(this);
        this.choosePalleteColor = this.choosePalleteColor.bind(this);
        this.saveTwoCanvas = this.saveTwoCanvas.bind(this);
        this.deletePreview = this.deletePreview.bind(this);
	}
    //color pallete module controller
    openColorModal() {
        this.setState({colorModalIsOpen: true});
    }

    closeColorModal() {
        this.setState({colorModalIsOpen: false});
    }
    
    openModal() {
        this.setState({modalIsOpen: true});
    }

    closeModal() {
        this.setState({modalIsOpen: false});
    }
    
    onRangeChange(value){
        this.setState({range:value})
    }

    //Added so canvas would not rerender on props change
    
    shouldComponentUpdate(nextProps, nextState){
        var shouldSelect = ((nextProps.select_id != this.props.select_id) || (nextProps.tree_num != this.props.tree_num));
        if (nextState.modalIsOpen != this.state.modalIsOpen){
            return true;
        }
        if (nextState.text != this.state.text){
            return true;
        }
        if (nextState.freehandColor != this.state.freehandColor){
            return true;
        }
        if (nextState.range != this.state.range){
            return true;
        }


        //color module
        if (nextState.colorList != this.state.colorList){
            return true;
        }

        if (nextState.colorModalIsOpen != this.state.colorModalIsOpen){
            return true;
        }

        if (nextState.canvas != this.state.canvas){
            return true;
        }

        if (nextState.previewList != this.state.previewList){
            return true;
        }


        if (shouldSelect){
            this.selectObject(nextProps.select_id);
            return false;
        }
        if (nextProps.event == "draw" && this.props.size == nextProps.size){
            this.drawImage(nextProps.image);
        }
        else if (nextProps.event == "addJson" && this.props.size == nextProps.size){
            this.addJsonToCanvas(nextProps.jsonKey);
        }
        return false;
    }
    
    componentDidMount(){
        var c = document.getElementById('c');
        var canvas = new fabric.Canvas('c', {
            isDrawingMode: false,
        });
        /*
        $(canvas.wrapperEl).on('mousewheel DOMMouseScroll', function(e) {
            var MAX_ZOOM_OUT = 1;
            var MAX_ZOOM_IN = 2;
            console.log("mousewheel");
            console.log(e)
            var pt = new fabric.Point(e.offsetX,e.offsetY);
            console.log(pt);
            var delta = e.originalEvent.wheelDelta / 120;
            var zoom;
            if(delta>0){
               zoom = 0.1;
               var pt = new fabric.Point(e.offsetX,e.offsetY);
            }else{
                zoom = -0.1;
                var pt = new fabric.Point(canvas.width/2,canvas.height/2);                
            }
            var val = canvas.getZoom()+zoom;
            if (val<MAX_ZOOM_OUT && val>MAX_ZOOM_IN){
                canvas.zoomToPoint(pt,val);
                console.log(canvas.getZoom());
                //canvas.setWidth(originalWidth * canvas.getZoom());
                //canvas.setHeight(originalHeight * canvas.getZoom());
            }               
        });
        */
        this.setState({canvas:canvas});
        console.log(canvas);
        
        var freeAdd = () => this.addFreehand();

        canvas.on('path:created', function(event) {
            // only happens when freehand object is added
            freeAdd();
        })
    }
    addJsonToCanvas(key){
        console.log("in add to json canvas");
        var proj = this.getProjects()[0];
        var request = new XMLHttpRequest();
        request.withCredentials = true;
        
        request.open("GET", server+"/api/projects/"+proj+"/renderedImages/canvas"+key, false);
        request.send(null);
        
        var response = JSON.parse(request.response);
        if (request.status !== 200){
            alert("Error Getting Serialized Canvas\n Error: "+request.status);
            return;
        }
        if (response.success == true){
            if(response.json !=null){
               var canvasJson = JSON.parse(response.json);
                var canvas = this.state.canvas;            
                this.clearCanvas();
                canvas.loadFromDatalessJSON(canvasJson, function(){
                    canvas.renderAll(canvas);
                    document.getElementById("c").click();
                });
                var endP = server+"/api/projects/"+proj+"/renderedImages/layer"+key;
                this.props.loadLayerTree(endP); 
            }else{
                alert("No Serialized Canvas found");
            }        
	    }                     
    }

    // Selects object based on the current layer
    // Layer 0 corresponds to the image that is the furthest back
    selectObject(id){
        var canvas = this.state.canvas;
        canvas.setActiveObject(canvas.item(id));
    }
    
    previewClicked(){         
        var activeCanvas = this.state.canvas;
        if (activeCanvas.getObjects().length == 0){
            alert("Add Objects to the Canvas");
        }else{
            activeCanvas.discardActiveObject();
            activeCanvas.deactivateAll().renderAll();
            var ctx = activeCanvas.getContext('2d');
            var image = canvasToImage(ctx,activeCanvas,this.props.maxSize);
            this.props.previewClicked(image.src,image.width,image.height);
        }
    }
    
    saveButton(){        
        var activeCanvas = this.state.canvas; 
        activeCanvas.discardActiveObject();
        if (activeCanvas.getObjects().length == 0){
            alert("Add Objects to the Canvas");
        }else{
            var ctx = activeCanvas.getContext('2d');
            var img = canvasToImage(ctx,activeCanvas,this.props.size);
            var canvasJSON = activeCanvas.toDatalessJSON();
            var strJSON = JSON.stringify(canvasJSON);
            var saved = this.saveRenderedCanvas(img.src,strJSON);
            if (saved== true){
                alert("Your image has been saved");            
            }
        }
    }
    
    drawImage(image){
        var canvas = this.state.canvas;
        var image_number = this.state.image_number;
        this.state.image_number = this.state.image_number + 1;
        this.props.treeAdd(image, image_number);

        fabric.Image.fromURL(image, function(oImg){
            oImg.id = image_number;
            if(oImg.width>oImg.height){
               oImg.scaleToWidth(200);
            }else{
                oImg.scaleToHeight(200); 
            }
            canvas.add(oImg);
        },);        
    } 
    
    moveObjectForward(){
        var canvas = this.state.canvas;
        var object = canvas.getActiveObject();
        if (object!= null){    
            var zindex = canvas.getObjects().indexOf(object);
            var id = object.get('id');
            canvas.bringForward(object);
            var new_zindex = canvas.getObjects().indexOf(object);
            if (zindex != new_zindex){
                this.props.imageUp(new_zindex, id);
            }
            console.log(canvas);
        }
    }
    
    moveObjectBackward(){
        var canvas = this.state.canvas;
        var object = canvas.getActiveObject();
        if (object != null){    
            var zindex = canvas.getObjects().indexOf(object);
            var id = object.get('id');
            canvas.sendBackwards(object);
            var new_zindex = canvas.getObjects().indexOf(object);
            if (zindex != new_zindex){
                this.props.imageDown(new_zindex, id);
            }
        }
    }

    deleteActiveObject(){
        var canvas = this.state.canvas;
        var object = canvas.getActiveObject();
        if (object!=null){
            var id = object.get('id');
            var zindex = canvas.getObjects().indexOf(object);
            this.props.imageDelete(zindex, id);
            object.remove();
        }
        
    }

    addFreehand(){
        var image_number = this.state.image_number;
        this.state.image_number = this.state.image_number + 1;
        this.props.addFreehand(image_number);
    }

    addText(){
        var canvas = this.state.canvas;
        var image_number = this.state.image_number;
        this.state.image_number = this.state.image_number + 1;
        this.props.addText(image_number);
        canvas.add(new fabric.IText('Tap and type text here', { 
          fontFamily: 'arial black',
          fontSize: 20,
          left: 100, 
          top: 100 ,
          id: image_number
        }));
    }

    selectColor(){
        var canvas = this.state.canvas;
        var object = canvas.getActiveObject();

        var filter = new fabric.Image.filters.Tint({
            color: cHex,
            opacity: alpha
        });

        if(object != null && object.get('type') == 'i-text'){
            object.setFill(cHex);
            canvas.renderAll();
        }
        else if (object!= null){
            object.setFill(cHex);
            object.filters.push(filter);
            object.applyFilters(canvas.renderAll.bind(canvas));
            canvas.renderAll();
        }
    }

    setHalo(){
        var canvas = this.state.canvas;
        var object = canvas.getActiveObject();
        if (object != null){
            object.setShadow({color: cHex, blur: 100 });
            canvas.renderAll();
        }
    }

    clearCanvas(){
        var canvas = this.state.canvas;
        var object = canvas.getActiveObject();
        canvas.clear();
        canvas.renderAll();
        this.props.canvasClear();
    }

    removeWhiteSpace(){
        var canvas = this.state.canvas;
        var object = canvas.getActiveObject();
        var whiteFilter = new fabric.Image.filters.RemoveWhite({
              threshold: 40,
              distance: 140
        });
        if (object!= null){
            object.setFill(cHex);
            object.filters.push(whiteFilter);
            object.applyFilters(canvas.renderAll.bind(canvas));
            canvas.renderAll();
        }
    }

    tryAnotherColor(){
        var canvas = this.state.canvas;
        var objects = canvas.getObjects();
        var object = objects[0];



        if(object != null && object.get('type') == 'i-text'){
            object.setFill(pallete[color_code]);
            canvas.renderAll();
        }
        else if (object == null){
            alert('Please add base image to the canvas.');
        }
        else{

            if(color_code >= pallete.length - 1 || color_code == null){
                color_code = 0;
            }
            else {
                color_code = color_code + 1;
            }

            var filter = new fabric.Image.filters.Tint({
            color: pallete[color_code],
            opacity: alpha
            });

            object.setFill(pallete[color_code]);
            object.filters.push(filter);
            object.applyFilters(canvas.renderAll.bind(canvas));
            canvas.renderAll();
            

            
            //save the canvas
            var activeCanvas = this.state.canvas;
            activeCanvas.discardActiveObject();
            var ctx = canvas.getContext('2d');

            var img = canvasToImage(ctx,canvas,this.props.size);
//            alert(img.src);

            //update preview URLs
            const pu = previewURLs;
            previewURLs = pu.concat([img.src]);
            this.setState({
                previewList: previewURLs.map((url)=><img src={url} style={{padding: 6}} onClick = {()=>this.deletePreview(previewURLs.indexOf(url))}/>)
            });


            this.props.previewClicked(img.src,img.width,img.height);
            var canvasJSON = activeCanvas.toDatalessJSON();
            var strJSON = JSON.stringify(canvasJSON);

//            var saved = this.saveRenderedCanvas(img.src,strJSON);
        }
    }


    deletePreview(e) {
        previewURLs.splice(e,1);
        this.setState({
                previewList: previewURLs.map((url)=><img src={url} style={{padding: 6}} onClick = {()=>this.deletePreview(previewURLs.indexOf(url))}/>)
            });
    }

    addColor() {
        //add a color to the palette
        if (p_cHex != null){
           const cl = pallete;
           pallete = cl.concat([p_cHex]);
           this.setState({
              colorList: pallete.map((color)=><button value={pallete.indexOf(color)} onClick = {()=>this.deleteColor(pallete.indexOf(color))} style = {{height: 20, width: 20, backgroundColor:color }}></button>)
           })

        }
        else {
            alert('Pick a color.');
        }
    }

    deleteColor(e) {

        pallete.splice(e,1);
        this.setState({
            colorList: pallete.map((color)=><button value={pallete.indexOf(color)} onClick = {()=>this.deleteColor(pallete.indexOf(color))} style = {{height: 20, width: 20, backgroundColor:color }}></button>)
        })

    }

    choosePalleteColor(c){
        p_cHex = c.hex;
    }

    saveTwoCanvas(){
        for (var i=0;i<previewURLs.length;i++){
            var saved = this.saveRenderedCanvas(previewURLs[i]);
        }

    }


    
    chooseColor(c){
        cHex = c.hex;
        rgb = c.rgb;
        alpha = c.rgb.a;
        var canvas = this.state.canvas;
        var object = canvas.getActiveObject();
        var filter = new fabric.Image.filters.Tint({
            color: c.hex,
            opacity: 1.0
        });
        var whiteFilter = new fabric.Image.filters.RemoveWhite({
              threshold: 40,
              distance: 140
        });
        if(colorMode == "interior"){
            if(object != null && object.get('type') == 'i-text'){
                object.setFill(c.hex);
                canvas.renderAll();
            }
            else if (object!= null){
                object.setFill(c.hex);
                object.filters.push(whiteFilter);
                object.filters.push(filter);
                object.applyFilters(canvas.renderAll.bind(canvas));
                canvas.renderAll();
            }

        }else if(colorMode == "halo"){
            if (object != null){
            object.setShadow({color: c.hex, blur: 100 });
            canvas.renderAll();
            }
        }
        
    }
    getProjects(){

        var request = new XMLHttpRequest();

        request.withCredentials = true;

        request.open("GET", server+"/api/projects", false);
        request.send(null);

        var response = JSON.parse(request.response);

        if (request.status !== 200){
            alert("synchronous request failed\n Error: "+request.status);
            return [];
        }

        {/*
        this.setState({projects: response.projects});
        */}

        return response.projects;

    }

    enterDrawingMode(){
        var canvas = this.state.canvas;
        canvas.isDrawingMode = !canvas.isDrawingMode;
        
        if(this.state.freehandColor == 'transparent'){
            this.setState({freehandColor : 'green'});
        }
        else{
            this.setState({freehandColor : 'transparent'});
        }
        canvas.renderAll();
    }
    
    saveGroup(){
        var activeCanvas = this.state.canvas; 
        activeCanvas.discardActiveObject(); 
        if (activeCanvas.getObjects().length == 0){
            alert("Add Objects to Canvas");
        }else{
            var ctx = activeCanvas.getContext('2d');        
            var num = document.getElementById("group_num").value;
            if (num < 2 || num > 20){
                alert("Please choose a number between 2 and 20");
            }else{
                var canvasJSON = activeCanvas.toDatalessJSON();
                var strJSON = JSON.stringify(canvasJSON);
                var range = this.state.range;
                var sizes = [range[0]]
                var inc = Math.round((range[1]-range[0])/(num-1));
                for (var i=1; i < num-1; i++){
                    sizes.push(range[0]+i*inc)
                }
                sizes.push(range[1])
                var chk = true;
                for(i=0; i< num; i++){
                    var data = canvasToImage(ctx,activeCanvas,sizes[i]);
                    chk = this.saveRenderedCanvas(data.src,strJSON);
                }
                if (chk == true){
                    alert(num + ' Push pins have been saved with sizes between ' + range[0] + ' and ' + range[1]);
                }
                this.closeModal();   
            } 
        }
    }
    
    saveRenderedCanvas(dataURI,canvasJSON){
        var comp = this;
        $.ajax(
            {
                url : server+"/api/projects",
                type : "GET",
                xhrFields: {
                       withCredentials: true
                },
                crossDomain: true,
                success : function(data) {
                    if (data.success === true){
                        var project = data.projects[0];
                        var renderedImageEndPoint = server+"/api/projects/"+project+"/renderedImages/image";                      
                        $.ajax(
                               {

                                    url: renderedImageEndPoint,
                                    type:"POST",
                                    xhrFields: {
                                        withCredentials: true
                                    },
                                    data :{
                                        image:dataURI
                                    },
                                    crossDomain: true,

                                    success: function(data){
                                        if (data.success == true){
                                            saveCanvasJSON(canvasJSON,project,data.renderedImage._id);
                                            comp.props.imageSaved(data.renderedImage._id);
                                            var endP = server+"/api/projects/"+project+"/renderedImages/layer/"+data.renderedImage._id;
                                            comp.props.saveLayerTree(endP);

                                        }else{
                                            alert(data.message);                    
                                        }
                                    }
                            })
                            .fail(
                                function() { alert("ajax failure"); return false;}
                            );


                    }
                }
            })
            .fail(
                function() { alert("ajax failure");return false;}        
            ); 
    return true;
}
    
    choose () {
         showPicker = true;
    }
    render() {
        
        return (
            <div>
                
                <div className = "image-list" style = {{height: 300, width: 55, float: 'left', borderWidth: 1, borderStyle: 'solid', borderColor: '#13496e', marginLeft: 0.45}}>
                    <LayerTree />
                </div>

                <div className = "image-list" style = {{height: 300, width: 45, float: 'left', borderWidth: 1, borderStyle: 'solid', borderColor: '#13496e'}}>
                    <div className = "library-spacing" />
                    <a data-tip data-for='moveObjectForward'><img onClick = {this.moveObjectForward} className = "iconButton" src="http://i.imgur.com/cBT1liY.png" style={{width: 30, height: 30}} /></a>
                    <a data-tip data-for='deleteActiveObject'><img onClick = {this.deleteActiveObject} className = "iconButton" src="http://www.iconsdb.com/icons/preview/red/delete-2-xxl.png" style={{width: 30, height: 30}}/></a>
                    <a data-tip data-for='moveObjectBackward'><img onClick = {this.moveObjectBackward} className = "iconButton" src="http://i.imgur.com/DRiJRO4.png" style={{width: 30, height: 30}} /></a>
                </div>

                <div className = "canvas" style = {{height: 300, width: 300, float: 'left', borderWidth: 1, borderStyle: 'solid', borderColor: '#13496e'}}>
                    <canvas id = "c" width={300} height={300}></canvas>   
                </div>
                <div className = "image-list" style = {{height: 300, width: 45, float: 'left', borderWidth: 1, borderStyle: 'solid', borderColor: '#13496e'}}>
                    <div className = "library-right-spacing" />

                    <a data-tip data-for='addText'><img onClick = {this.addText} src = "https://cdn0.iconfinder.com/data/icons/layout-and-location/24/Untitled-2-23-32.png" className = "iconButton" /></a>
                    <a data-tip data-for='selectColor'><img onClick = {this.selectColor} src = "https://cdn0.iconfinder.com/data/icons/outline-icons/320/Paint-32.png" className = "iconButton" /></a>
                    <a data-tip data-for='setHalo'><img onClick = {this.setHalo} src={require('../../static/icons/halo2.png')} className = "iconButton"/></a>
                    <a data-tip data-for='enterDrawingMode'><img onClick = {this.enterDrawingMode} style = {{backgroundColor: this.state.freehandColor}} src = "https://cdn4.iconfinder.com/data/icons/48-bubbles/48/15.Pencil-32.png" className = "iconButton" /></a>
                    <a data-tip data-for='buttonClick'><img onClick = {this.previewClicked} src = "https://cdn1.iconfinder.com/data/icons/freeline/32/eye_preview_see_seen_view-32.png" className = "iconButton" /></a>
                    <a data-tip data-for='saveButton'><img onClick = {this.saveButton} src = "https://cdn2.iconfinder.com/data/icons/ios-7-icons/50/upload2-32.png" className = "iconButton" /></a>
                    <a data-tip data-for='clearCanvas'><img onClick = {this.clearCanvas} src = "https://cdn0.iconfinder.com/data/icons/octicons/1024/trashcan-32.png" className = "trashIcon" /></a>
                    
                    <ReactTooltip id='moveObjectForward' type='warning'>
                      <span>Move selected object forward</span>
                    </ReactTooltip>
                    <ReactTooltip id='deleteActiveObject' type='warning'>
                      <span>Delete selected object</span>
                    </ReactTooltip>
                    <ReactTooltip id='moveObjectBackward' type='warning'>
                      <span>move selected object backwards</span>
                    </ReactTooltip>
                    <ReactTooltip id='addText' type='warning'>
                      <span>Add text to current Project</span>
                    </ReactTooltip>
                    <ReactTooltip id='selectColor' type='warning'>
                      <span>Fill in color to selected object</span>
                    </ReactTooltip>
                    <ReactTooltip id='setHalo' type='warning'>
                      <span>Add Halo to selected Object</span>
                    </ReactTooltip>
                    <ReactTooltip id='enterDrawingMode' type='warning'>
                      <span>Enter freehand drawing mode</span>
                    </ReactTooltip>
                    <ReactTooltip id='buttonClick' type='warning'>
                      <span>Preview project on the map</span>
                    </ReactTooltip>
                    <ReactTooltip id='saveButton' type='warning'>
                      <span>Save current project</span>
                    </ReactTooltip>
                    <ReactTooltip id='clearCanvas' type='warning'>
                      <span>Clear current project</span>
                    </ReactTooltip>


                </div>
                <div style = {{height: 300, width: 221, float: 'left', borderStyle: 'solid', borderWidth: 1, borderColor: '#13496e', marginLeft: 0}}><SketchPicker color={ 'black' } onChange={ this.chooseColor }/></div>
                <div className = "buttons" style = {{height: 30, width: 980, float:'left'}}>
                    <button onClick = {this.openModal}>Create Group by Size</button>

                    <Modal
                        isOpen = {this.state.modalIsOpen}
                        onAfterOpen = {this.afterOpenModal}
                        onRequestClose = {this.closeModal}
                        style = {customStyles}
                        contentLabel = "Group Modal"
                    >
                    <div style = {{padding:'2px 16px', 'backgroundColor':'#13496e',color: 'white'}}>
                        <p>Create Group Based on Size</p>            
                    </div>      
                                 
                    <div style = {{padding:'2px 16px','fontSize':'12px'}}>               
                        <p>Min = {this.state.range[0]}px</p>
                       <Range id= "group_range" allowCross={false} min={5} max={100} defaultValue={[25,75]} onChange={this.onRangeChange}/>
                        <p>Max = {this.state.range[1]}px</p>
                        Number of Pins: <input id = "group_num" type="number" min="2" max = "100"></input>
                    </div>
                    <div style = {{padding:'2px 16px'}}>
                        <button onClick={this.closeModal}>Cancel</button>
                        <button onClick={this.saveGroup}>Save</button>
                    </div>
                    </Modal>

                    <Modal
                        isOpen = {this.state.colorModalIsOpen}
                        onAfterOpen = {this.afterOpenModal}
                        onRequestClose = {this.closeColorModal}
                        style = {customPalleteStyles}
                        contentLabel = "Pallete Modal"
                    >


                    <div style = {{padding:'2px 16px', 'backgroundColor':'#13496e',color: 'white'}}>
                         <p>Manage Palette</p>
                    </div>
                    <div style = {{height: 300, width: 221, float: 'left', display:'inline-block', marginLeft: 10, marginTop: 10}}>
                        <SketchPicker color={ 'black' } onChange={ this.choosePalleteColor }/>
                    </div>

                    <div style = {{height: 300, width: 221, float: 'left', marginLeft: 10, marginTop: 10}}>
                        <p>Step 1: Create a palette</p>
                        {this.state.colorList}
                        <button onClick = {this.addColor} style={{paddingTop: -5}}>+</button>

                        <p>Step 2: Preview with base color in the palette</p>
                        <div style={{height: 130, width: 221, float: 'left', borderStyle: 'solid', borderWidth: 1, borderColor: '#13496e', marginLeft: 0}}>{this.state.previewList}</div>
                        <div style = {{padding:'2px 16px', position:'absolute', bottom: 12, left: 223}}>
                        <button onClick = {this.tryAnotherColor}>Preview and Try Another Color</button>
                        <button onClick = {this.saveTwoCanvas}>Save</button>
                        </div>
                    </div>




                    </Modal>

                    <button onClick = {this.openColorModal}>Create Group by Color</button>
                    <button onClick = {this.removeWhiteSpace}>Remove Object WhiteSpace</button>

                </div>  
            </div>          
        );
    }
}

FabricCanvas.propTypes = {

	image: PropTypes.string,
    previewClicked: PropTypes.func.isRequired,
    imageUp: PropTypes.func.isRequired,
    imageDown: PropTypes.func.isRequired,
    imageDelete: PropTypes.func.isRequired,
    canvasClear: PropTypes.func.isRequired,
    imageAdded:PropTypes.func.isRequired,
    size: PropTypes.number,
    maxSize: PropTypes.number,
    select_id: PropTypes.number.isRequired,
    addText: PropTypes.func.isRequired,
    addFreehand: PropTypes.func.isRequired,
    new_id: PropTypes.number.isRequired,
    jsonKey: PropTypes.string,
    event: PropTypes.string.isRequired,
    imageSaved: PropTypes.func.isRequired,
    tree_num: PropTypes.number.isRequired,
    saveLayerTree:PropTypes.func.isRequired,
    loadLayerTree:PropTypes.func.isRequired,
    treeAdd: PropTypes.func.isRequired
}

FabricCanvas.defaultProps = {

	image: "",
    previewClicked: (dataURL,sizeX,sizeY) => console.log("Clicked on preview"),
    imageUp: (zindex, object) => console.log("zindex is"+zindex),
    imageDown: (zindex) => console.log("zindex is"+zindex),
    imageDelete: (zindex, object) => console.log("zindex is"+zindex),
    imageAdded:(url)=>console.log("image added"),
    canvasClear: () => console.log("canvas cleared"),
    imageSaved:(key)=>console.log("Image Saved"),
    saveLayerTree:(endP)=>console.log("Save layer tree"),
    loadLayerTree:(endP_l)=>console.log("Load layer tree"),
    select_id: -1,
    new_id: 0,
    maxSize: 100,
    addText: () => console.log("text was added"),
    addFreehand: () => console.log("freehand was added"),
    treeAdd: () => console.log("added to tree"),
    event:"",
    jsonKey:"",
    tree_num: -1
}

function mapDispatchToProps(dispatch) {
    return ({
        previewClicked: (dataURL,sizeX,sizeY) => {dispatch(previewImage(dataURL,sizeX,sizeY))},
        imageUp: (zindex, object) => {dispatch(imageBroughtUp(zindex, object))},
        imageDown: (zindex, object) => {dispatch(imageSentDown(zindex, object))},
        imageDelete: (zindex, object) => {dispatch(imageDeleted(zindex, object))},
        imageAdded: (url) => {dispatch(imageAddedJson(url))},
        canvasClear: () => {dispatch(canvasCleared())},
        addText: (id) => {dispatch(textAdd(id))},
        addFreehand: (id) => {dispatch(freehandAdd(id))},
        imageSaved:(key)=>{dispatch(imageRendered(key))},
        saveLayerTree:(endP) => {dispatch(saveLayerTree(endP))},
        loadLayerTree:(endP_l) => {dispatch(loadLayerTree(endP_l))},    
        treeAdd: (im, id)=>{dispatch(treeAdd(im,id))}
    })
}


const mapStateToProps = (state) => {
	return {
		image:state.library.src,
        size: state.slider.value,
		color: state.color.color,
        select_id: state.canvas.select_id,
        new_id: state.library.new_id,
        jsonKey: state.library.key,
        event: state.library.event,
        tree_num: state.canvas.tree_num
	}
}

const FabricContainer = connect(mapStateToProps, mapDispatchToProps)(FabricCanvas); 

export default FabricContainer;
