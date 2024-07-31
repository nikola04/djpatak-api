import { Schema, model } from "mongoose";
import { IUser } from "types/user";

const userSchema = new Schema<IUser>({
    name: String,
    email: String,
    image: String
});

const UserModel = model('users', userSchema);

export default UserModel