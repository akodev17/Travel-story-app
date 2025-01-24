require("dotenv").config()
const bcrypt = require("bcrypt")
const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const config = require("./config.json")
const mongoose = require("mongoose")
const {authenticateToken} = require('./utilities')
const upload = require('./multer')
const fs = require('fs')
const path = require('path')

mongoose.connect((config.connectionString)).then(()=>{
    console.log("database connected")
})
const app = express()
app.use(express.json())
app.use(cors({origin:"*"}))
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const User = require("./models/user.model")
const TravelStory = require("./models/travelStory.model")

app.get("/",(req,res)=>{
    return res.status(200).json({"message":"this is req"})
})

//create account
app.post("/create-account",async (req,res)=>{
    const {fullName,email,password} = req.body
    if(!fullName || !email || !password){
        return res.status(400).json({error:"all fields are required."})
    }
    const isUser = await User.findOne({email})
    if(isUser){
        return res
        .status(400)
        .json({error:true,message:"user already exists"})
    }
    const hashedPassword = await bcrypt.hash(password,10)
    const user = new User({
        fullName,
        email,
        password:hashedPassword
    })
    await user.save()

    const accessToken = jwt.sign(
    {userId:user._id},
    process.env.ACCESS_TOKEN_SECRET,
    {expiresIn:"72h"}) 
    
    return res.status(201)
    .json({error:false,
        user:{fullName:user.fullName,email:user.email},
        accessToken,
        message:"registration success full"
    })
})
 
//login
app.post("/login",async(req,res)=>{
    const {email,password} = req.body
    if(!email || !password){
        return res.status(400)
        .json({error:"all fields are required."})
    }

    const user = await User.findOne({email})
    if(!user){
        return res.status(400)
        .json({error:"user not found"})
    }
    const isPasswordValid = await bcrypt.compare(password,user.password)
    if(!isPasswordValid){
        return res.status(400)
        .json({"status":"wrong credential"})
    }
    const accessToken = jwt.sign(
        {userId:user._id},
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn:"72h"})

    return res.status(201)
        .json({error:false,
            user:{fullName:user.fullName,email:user.email},
            accessToken,
            message:"Login success full"
        })
})

//get user
app.get("/get-user",authenticateToken,async(req,res)=>{
    const {userId} = req.user
    
    const isUser = await User.findOne({_id:userId})
    if(!isUser){
        res.sendStatus(401)
    }
    return res.json({
        user:isUser,
        message:"user is here"
    })

})



//route to handle image upload
app.post('/image-upload',upload.single("image"), (req,res)=>{
    try{
        if(!req.file){
            return res.status(400).json({error:true,
                message:"no image uploaded"})
        }
        const imageUrl = `http://localhost:8000/uploads/${req.file.filename}`
        res.status(200).json({imageUrl})
    }catch(err){
        res.status(500).json({error:true,message:error.message})
    }
}) 


//delete an image from uploads folder
app.delete("/delete-image",async(req,res)=>{
    const {imageUrl} = req.query
    if(!imageUrl){
        return res
        .status(400)
        .json({error:true,message:"imageUrl parameter is required"})
    }

    try{
        const filename = path.basename(imageUrl)
        //define the file path
        const filePath = path.join(__dirname,'uploads',filename)
        //check if the file exists
        if(fs.existsSync(filePath)){
            fs.unlinkSync(filePath)
            res.status(200).json({message:"image deleted successfully"})
        }else{
            res.status(200).json({error:true,message:"image not found"})
        }}catch(err){
            res.status(500).json({error:true,message:"image not found"})
    }
})

//serve static files from the uploads ans assests directory
app.use("/uploads",express.static(path.join(__dirname,"uploads")))
app.use("/assets",express.static(path.join(__dirname,"assets")))



//add travel story
app.post("/add-travel-story",authenticateToken,async(req,res)=>{
    const {title,story,visitedLocation,imageUrl,visitedDate} = req.body
    const {userId} = req.user

    if(!title || !story || !visitedLocation || !imageUrl || !visitedDate){
        return res.status(400).json({error:true,message:"All fields required."})
    }
    //convert visited date from milliseconds to date object
    const parsedVisitedDate = new Date(parseInt(visitedDate))
    try{
        const travelStory = new TravelStory({
            title,
            story,
            visitedLocation,
            userId,
            imageUrl,
            visitedDate:parsedVisitedDate
        });
        await travelStory.save();
        res.status(201).json({story:travelStory,message:"Added successfully"})
    }catch(err){
        res.status(400).json({error:true,message:error.message})
    }

})


//get all travel stories
app.get('/get-all-stories',authenticateToken,async (req,res)=>{
    const {userId} = req.user
    try{
        const travelStories = await TravelStory.find({userId:userId}).sort({isFavourite:-1})
        res.status(200).json({stories:travelStories})
    }catch(error){
        res.status(500).json({error:true,message:error.message})
    }
})

//edit travel story
app.put("/edit-story/:id",authenticateToken,async (req,res)=>{
    const {id} = req.params
    const {title,story,visitedLocation,imageUrl,visitedDate} = req.body
    const {userId} = req.user

    //validate required fields
    if(!title || !story || !visitedLocation || !visitedDate){
        return res
        .status(400)
        .json({error:true,message:"All fields are required."})
    }

    //converted visited date from milliseconds to date object
    const parsedVisitedDate = new Date(parseInt(visitedDate))

    try{
        //find travel story by id and ensure it belongs to the authenticated user
        const travelStory = await TravelStory.findOne({_id:id,userId:userId})
        if(!travelStory){
            return res.status(400).   json({error:true,message:"Travel story not found"})
        }

        const placeHolderImageUrl = `http://localhost:8000/assets/placeholder.png`

        travelStory.title = title
        travelStory.story = story
        travelStory.visitedLocation = visitedLocation
        travelStory.imageUrl = imageUrl || placeHolderImageUrl
        travelStory.visitedDate = parsedVisitedDate

        await travelStory.save()
        res.status(200).json({story:travelStory,message:"Update successful"})
    }catch(err){
        res.status(500).json({error:true,message:err.message})
    }
})

//delete travel story
app.delete("/delete-story/:id",authenticateToken,async(req,res)=>{
    const {id} = req.params
    const {userId} = req.user
    console.log(id)
    try{
        //find the travel story by id and ensure it belongs to the authenticated user
        const travelStory = await TravelStory.findOne({_id:id,userId:userId})

        if(!travelStory){
            return res.status(404).json({error:true,message:"Travel story not found"})
        }
        //delete the travel story from the database
        await travelStory.deleteOne({_id:id,userId:userId})

        //extract the filename from the database
        const imageUrl = travelStory.imageUrl
        const filename = path.basename(imageUrl)

        //define the file path
        const filePath = path.join(__dirname,'uploads',filename)

        //delete the image file from the uploads folder
        fs.unlink(filePath,(err)=>{
            if(err){
                console.log("Failed to delete image file: ",err)
            }
        })
        res.status(200).json({message:"Travel story deleted successfully."})
    }catch(err){
        res.status(500)
    }
})


//update isFavorite
app.put("/update-is-favourite/:id",authenticateToken,async(req,res)=>{
    const{id} = req.params
    const{isFavourite} = req.body
    const{userId} = req.user

    try{
        const travelStory = await TravelStory.findOne({_id:id,userId:userId})
        if(!travelStory){
            return res.status(404).json({error:true,message:"Travel story not found"})
        }
        travelStory.isFavourite = isFavourite

        await travelStory.save()
        res.status(200).json({story:travelStory,message:"Update successful"})
    }catch(err){
        res.status(500).json({error:true,message:err.message})
    }
})


//search travel stories
app.get("/search",authenticateToken,async (req,res)=>{
    const {query} = req.query
    const {userId} = req.user

    if(!query){
        return res.status(404).json({error:true,message:"Query is required"})
    }

    try{
        const searchResults = await TravelStory.find({
            userId:userId,
            $or:[
                {title:{$regex:query,$options:'i'}},
                {story:{$regex:query,$options:'i'}},
                {visitedLocation:{$regex:query,$options:"i"}}
            ]
        }).sort({isFavourite:-1})

        res.status(200).json({stories:searchResults})
    }catch(err){
        res.status(200).json({stories:searchResults})
    }
})


//filter travel stories by date range
app.get("/travel-stories/filter",authenticateToken,async(req,res)=>{
    const {startDate,endDate} = req.query
    const {userId} = req.user

    try{
        //convert startDate and endDate from milliseconds to date objects
        const start = new Date(parseInt(startDate))
        const end = new Date(parseInt(endDate))

        //find travel stories that belong to the authenticated use and fall within the date range
        const filteredStories = await TravelStory.find({
            userId:userId,
            visitedDate:{$gte:start,$lte:end}
        }).sort({isFavourite:-1})

        res.status(200).json({stories:filteredStories})
    }catch(error){
        res.status(500).json({error:true,message:error.message})
    }
})


app.listen(8000)
module.exports = app

