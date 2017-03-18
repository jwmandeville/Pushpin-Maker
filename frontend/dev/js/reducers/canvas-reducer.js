import {previewImage,imageSaved} from '../actions';

const initialState = {

	src: ""
}

export default function preview(state = initialState, action) {

	switch (action.type){

		case 'PREVIEW_IMAGE':
			return Object.assign({}, state, {
                src:  action.url
            })
        case 'IMAGE_SAVED':
            return Object.assign({},state,{
              url: action.url  
            })
		default:
			return state

	}
}
	