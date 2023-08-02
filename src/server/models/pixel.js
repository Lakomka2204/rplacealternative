const mongoose = require('mongoose');
const Pixel = new mongoose.Schema({
    color:{
        required:true,
        type:String,
        match:/^#[0-9A-Fa-f]{6}$/,
    },
    placedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true,
    },
    position:{
        type:{
            x:{type:Number,required: true},
            y:{type:Number,required: true}
        },
        required:true,
    }
},{timestamps:true});

module.exports = mongoose.model('Pixel',Pixel);