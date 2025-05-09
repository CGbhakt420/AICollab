import jwt from 'jsonwebtoken';
import dotenv from 'dotenv'
dotenv.config();

import redisClient from '../services/redis.service.js';

export const authUser = async (req, res, next)=>{
    try{
        const token = req.cookies.token || req.headers.authorization.split(' ')[1];
        if(!token){
            return res.status(401).send({error: 'Unauthorized User'});
        }

        const tokenBlacklist = await redisClient.get(token); //token mil jaata hai yaani blacklisted hai aur agar nahi milta hai yaani user ne logout nahi kiya hai
        //logged out token ko redis me store kardenge, because jwt is stateless and it will be valid until it is expired even afte logout
        if(tokenBlacklist){
            res.cookie('token', '');
            return res.status(401).send({error: 'Unauthorized User'})
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
        
    }
    catch(err){
        res.status(401).send({error: "Unauthorized User"});
    }
}