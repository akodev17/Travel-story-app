import { useEffect, useState } from "react"
import Navbar from "../../components/Navbar"
import {useNavigate} from "react-router-dom"
import axiosInstance from "../../utils/axiosInstance"
import TravelStoryCard from "../../components/Cards/TravelStoryCard"
import {ToastContainer,toast} from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import AddEditTravelStory from "./AddEditTravelStory"
import Modal from "react-modal"
import {MdAdd} from "react-icons/md"
import ViewTravelStory from "./ViewTravelStory"
import EmptyCard from "../../components/Cards/EmptyCard"
import EmptyImage from "../../assets/images/empty.jpg"

export default function Home() {
  const [searchQuery,setSearchQuery] = useState("")
  const navigate = useNavigate()
  const [userInfo,setUserInfo] = useState(null)
  const [allStories,setAllStories] = useState([])
  const [openAddEditModel,setOpenAddEditModel] = useState({
    isShown:false,
    type:"add",
    data:null
  })
  const[openViewModel,setOpenViewModel] = useState({
    isShown:false,
    data:null
  })

  //get user info
  const getUserInfo = async()=>{
    try{
      const response = await axiosInstance.get("/get-user")
      if(response.data && response.data.user){
        setUserInfo(response.data.user)
      }
    }catch(error){
      if(error.response.status ===401){
        localStorage.clear()
        navigate("/login")
      }
  
    }
  }

  //get all stories
  const getAllStories = async()=>{
    try{
      const response = await axiosInstance.get("/get-all-stories")
      if(response.data && response.data.stories){
        setAllStories(response.data.stories)
      }
    }catch(error){
      console.log("Error in loading :",error)
    }
  }

  //handle edit
  const handleEdit = (data)=>{
    setOpenAddEditModel({isShown:true,type:"edit",data:data})
  }
  //handle view story
  const handleViewStory = (data)=>{
    setOpenViewModel({isShown:true,data})
  }
  //handle is favourite
  const updateIsFavourite = async(storyData)=>{
    const storyId = storyData._id
    try{
      const response = await axiosInstance.put(
        '/update-is-favourite/'+storyId,
        {
          isFavourite: !storyData.isFavourite
        }
      )
      if(response.data && response.data.story){
        toast.success("Story Updated Successfully")
        getAllStories()
      }
    }catch(error){
      console.log("An unexpected error occured. Please try again.")
    }
  }

  //delete travel story
  const deleteTravelStory = async(data)=>{
    const storyId = data._id
    console.log(storyId)
    try{
      const response = await axiosInstance.delete("/delete-story/"+storyId)
      if(response.data && !response.data.error){
        toast.success("Story Deleted Successfully")
        setOpenViewModel((prevState)=>({...prevState,isShown:false}))
        getAllStories()
      }
    }catch(error){
      
        console.log("an unexpected Error")
    }
    
  }

  useEffect(()=>{
    getAllStories()
    getUserInfo()
    return ()=>{}
  },[])

  return (
    <>
      <Navbar userInfo={userInfo} searchQuery={searchQuery} setSearchQuery={setSearchQuery}/>

      <div className="container mx-auto py-10">
        <div className="flex gap-7">
          <div className="flex-1">
              {allStories.length > 0 ?(
                <div className="grid grid-cols-2 gap-4">
                  {allStories.map((item)=>{
                    return (
                    <TravelStoryCard key={item._id}
                    imageUrl={item.imageUrl}
                    title={item.title}
                    story={item.story}
                    date={item.visitedDate}
                    visitedLocation={item.visitedLocation}
                    isFavourite={item.isFavourite}
                    onEdit={()=>handleEdit(item)}
                    onClick={()=>handleViewStory(item)}
                    onFavouriteClick={()=>updateIsFavourite(item)}

                    />
                  )
                  })}
                </div>
              ):(
                <EmptyCard imgSrc={EmptyImage} message={`Start creating your first travel story! Click 'Add' button to jot 
                  down your thoughts, ideas and memories. Let's get started!`}/>
              )}
          </div>
          <div className="w-[320px]">

          </div>
        </div>
      </div>
      {/* add & edit travel story model*/}
      <Modal
        isOpen={openAddEditModel.isShown}
        onRequestClose={()=>{}}
        style={{
          overlay:{
            backgroundColor:"rgba(0,0,0,0.2)",
            zIndex:999
          }
        }}
        appElement={document.getElementById("root")}
        className="model-box"
        >
      <AddEditTravelStory
        type={openAddEditModel.type}
        storyInfo={openAddEditModel.data}
        onClose={()=>{
          setOpenAddEditModel({isShown:false, type:"add", data:null})
        }}
        getAllTravelStories={getAllStories}
        />
      </Modal> 
      
      <Modal
        isOpen={openViewModel.isShown}
        onRequestClose={()=>{}}
        style={{
          overlay:{
            backgroundColor:"rgba(0,0,0,0.2)",
            zIndex:999
          }
        }}
        appElement={document.getElementById("root")}
        className="model-box"
        >
          <ViewTravelStory
            storyInfo={openViewModel.data || null}
            onClose={()=>{
              setOpenViewModel((prevState)=>({...prevState,isShown:false}))
            }}
            onEditClick={()=>{
              setOpenViewModel((prevState)=>({...prevState,isShown:false}))
              handleEdit(openViewModel.data || null)
            }}
            onDeleteClick={()=>{
              deleteTravelStory(openViewModel.data || null)
            }}
          />
        </Modal>

      <button
      className="w-16 h-16 flex items-center justify-center rounded-full bg-primary hover:bg-cyan-400 fixed right-10 bottom-10"
      onClick={()=>{
        setOpenAddEditModel({isShown:true,type:"add",data:null})
      }}
      >
      <MdAdd className="text-[32px] text-white"/>
      </button> 
      <ToastContainer/>
    </>
  )
}
