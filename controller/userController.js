import { User } from "../db/dbconnection.js";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken"
import { generateAccessToken, generateRefreshToken } from "./auth/auth.js";

export const registerController = async (req, res) => {
  // return res.json("hello");
  //console.log(req.body)
  const { username, email, password } = req.body;
  const existUser = await User.findOne({ where: { username: username } });
  if (existUser != null) {
    return res.status(409).json("User is already exist");
  } else {
    const hashedPass = await bcryptjs.hash(password, 10);
    const user = await User.create({
      ...req.body,
      password: hashedPass,
    });
    return res.status(201).json({
      message:"User Signed in ",
      userData:{
        username,email
      }
    });
  }
};

export const loginController = async (req, res) => {
  const { username, password, email } = req.body;
  console.log(req.body)
  try {
    const exist = await User.findOne({ where: { username: username } });
    if (exist != null) {
      const isValid = bcryptjs.compare(password, exist.password);
      if (!isValid) {
        return res.status(401).json("Credential invalid");
      }
      console.log(exist.dataValues)
      const accessToken= await generateAccessToken(exist.dataValues);
      const refereshToken=await generateRefreshToken(exist.dataValues);
      exist.update({refereshToken:refereshToken})
      
      res.cookie("refereshToken",refereshToken,{httpOnly:true,secure:true});
      return res.status(200).json({
        message:"user loged in",
        userData:{
          username:exist.dataValues.username,
          accessToken:accessToken,
          refereshToken:refereshToken
        }
      });
    }else{
      return res.status().json("User is not exist");
    }
  } catch (e) {
    console.log("Internal Error");
    res.status(500).json("Internal Error");
  }
};

export const  refreshController=async(req,res)=>{
  const refreshToken=req.cookies.refereshToken
  //console.log(refreshToken)
  try{
    if(!refreshToken){
      return res.status(403).json("token is empty");
    }
    const user=await User.findOne({where:{refereshToken:refreshToken}});
    //console.log("ddddddddddd",user)
    jwt.verify(refreshToken,"cdef",async(error,decoded)=>{
      if(error){
        return res.status(403).json("Invalid token");
      }
      const token=await generateAccessToken(user.dataValues);
      return res.status(200).json({accessToken:token});

    })

  }catch(e){
    return res.status(500).json("Intrnal Error");
  }

}

export const logoutController=async(req,res)=>{
  const refreshToken=req.cookies.refereshToken;
  if(!refreshToken){
    return res.status(403).json("token is empty");
  }
  const user=await User.findOne({where:{refereshToken:refreshToken}});
  if(user!=null){
    user.update({refereshToken:null})
  }
  res.clearCookie("refereshToken")
  return res.status(200).json("logout successfully");

}

export const profileController=async(req,res)=>{
    return res.json("Dashboard");
}


