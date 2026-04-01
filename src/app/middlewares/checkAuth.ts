import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import catchAsync from "../../utils/catchAsync";
import config from "../config";
import { UserModel } from "../modules/auth/auth.model";

/**
 * Middleware to extract user information from JWT token if present.
 * Unlike the mandatory 'auth' middleware, this will NOT throw an error if the token is missing, 
 * invalid, or expired. It simply proceeds to the next middleware.
 */
const extractUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    let token = req.headers.authorization;

    if (token?.startsWith("Bearer ")) token = token.slice(7);

    // If no token is provided, just move to next middleware
    if (!token) {
        return next();
    }

    let decoded: jwt.JwtPayload;
    try {
        decoded = jwt.verify(token, config.jwt_access_secret as string) as { _id: string; role: string };
    } catch (err: any) {
        // If token is invalid or expired, just move to next middleware without req.user
        return next();
    }

    const user = await UserModel.findOne({ _id: decoded._id });

    // If user exists and is active, attach to request
    if (user && user.isActive && user.role === decoded.role) {
        req.user = user;
    }

    next();
});

export default extractUser;
