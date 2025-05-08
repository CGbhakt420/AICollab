import jwt from 'jsonwebtoken';
import dotenv from 'dotenv'
dotenv.config();

export const authUser = async (req, res, next)=>{
    try{
        const token = req.cookies.token || req.headers.authorization.split(' ')[1];
        if(!token){
            return res.status(401).send({error: 'Unauthorized User'});
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
        
    }
    catch(err){
        res.status(401).send({error: "Unauthorized User"});
    }
}