import { Schema, model } from "mongoose";

export interface IUser{
    _id: Schema.Types.ObjectId,
    name: string,
    email: string,
    image: string
}

const userSchema = new Schema<IUser>({
    name: String,
    email: String,
    image: String
});

const UserModel = model('users', userSchema);

export default UserModel