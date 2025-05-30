import User from "../db/models/user.model.js";

export const createUser = async ({
    email, password
}) => {
    if(!email || !password){
        throw new Error ("Email and password are required")
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new Error("Email is already in use");
    }

    const hashedPass = await User.hashPassword(password);
    const user = await User.create({
        email,
        password: hashedPass
    });

    return user;


}

export const getAllUsers = async ({userId})=>{
    const allUsers = await User.find({
        _id: { $ne: userId} //exclude logged in user
    });
    return allUsers;
}