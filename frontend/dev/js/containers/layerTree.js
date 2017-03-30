import React, {Component, PropTypes} from 'react';
import {connect} from 'react-redux';
import ReactScrollbar from 'react-scrollbar-js';
import {treeSelect} from '../actions';

class LayerTree extends Component {

	constructor(props){
		super(props);
		this.mapToImage = this.mapToImage.bind(this);
		this.tree_click = this.tree_click.bind(this);
		this.state = {
			images: [],
			num_selected: 0
		}
	}

	tree_click(id){
		var index = this.state.images.findIndex(im => im.id == id);
		var zindex = this.state.images.length - index - 1;
		this.props.tree_click(zindex, ++this.state.num_selected);
	}

	componentWillReceiveProps(nextProps){
		if (nextProps.event == "new"){
			if (this.state.images == []){
				this.state.images = [{url: nextProps.new_image, id: nextProps.new_id}];
			}
			else{
				this.state.images = [{url: nextProps.new_image, id: nextProps.new_id}].concat(this.state.images);
			}
		}
		else if (nextProps.event == "up"){
			var zindex = this.state.images.length - nextProps.new_zindex - 1;
			if (zindex >= 0){
				var temp = this.state.images[zindex];
				this.state.images[zindex] = this.state.images[zindex+1];
				this.state.images[zindex+1] = temp;
			}
		}
		else if (nextProps.event == "down"){
			var zindex = this.state.images.length - nextProps.new_zindex - 1;
			if (zindex <= this.state.images.length - 1){
				var temp = this.state.images[zindex];
				this.state.images[zindex] = this.state.images[zindex-1];
				this.state.images[zindex-1] = temp;
			}
		}
		else if (nextProps.event == "delete"){
			var zindex = this.state.images.length - nextProps.index_to_remove - 1;
			this.state.images.splice(zindex, 1);
		}
		else if (nextProps.event == "clear"){
			this.state.images = [];
		}
	}

    mapToImage(images){

        return images.map((obj) =>                              
            <p><img src={obj.url} onClick={() => this.tree_click(obj.id)} style={{height: 25, width: 25, padding:5}} /> <br /></p>);

    }

	render(){
		const treeImages = this.mapToImage(this.state.images);

		return (
			<ReactScrollbar style = {{height: 300, width: 55}}>
				<div>{treeImages}</div>
			</ReactScrollbar>
		);
	}
}


LayerTree.propTypes = {
    new_image: PropTypes.string.isRequired,
    new_zindex: PropTypes.number.isRequired,
    object_id: PropTypes.number.isRequired,
    event: PropTypes.string.isRequired,
    index_to_remove: PropTypes.number.isRequired,
    new_id: PropTypes.number.isRequired,
    tree_click: PropTypes.func.isRequired
}

LayerTree.defaultProps = {
    new_image: "",
    new_zindex: 0,
    object_id: 0,
    index_to_remove: 0,
    event: "",
    new_id: 0,
    tree_click: () => console.log("id "+obj.id+" was clicked")
}

const mapStateToProps = (state) => {
	return {
		new_image: state.tree.new_image,
		new_zindex: state.tree.new_zindex,
		object_id: state.tree.object_id,
		index_to_remove: state.tree.index_to_remove,
		event: state.tree.event,
		new_id: state.tree.new_id
	}
}

function mapDispatchToProps(dispatch){
	return ({
		tree_click: (id, num) => {dispatch(treeSelect(id, num))}
	})
}

const LayerContainer = connect(mapStateToProps, mapDispatchToProps)(LayerTree);

export default LayerContainer;