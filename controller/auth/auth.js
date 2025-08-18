import jwt from "jsonwebtoken";


const generateAccessToken=async(user)=>{
    const token=jwt.sign({username:user.usename},"abcd",{expiresIn:"15min"});
    return token;

}

const generateRefreshToken=async(user)=>{
    const token=jwt.sign({username:user.usename},"cdef",{expiresIn:"7d"});
    return token;

}

const authenticateToken=async(req,res,next)=>{
    const token= req.headers["authorization"].split(" ")[1]
    if(!token){
        return res.status(401).json("Invalid token");
    }
    jwt.verify(token,"abcd",async(error,decoded)=>{
        if(error){
            return res.status(403).json("Token Expired");
        }
        next()
    });

}

export {
    generateAccessToken,generateRefreshToken,authenticateToken
}