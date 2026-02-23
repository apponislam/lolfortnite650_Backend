import { NextFunction, Request, Response } from "express";
import ApiError from "../../errors/ApiError";
import httpStatus from "http-status";

const authorize = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized"));
        }

        const userRole = req.user.role;
        if (!userRole || !allowedRoles.includes(userRole)) {
            return next(new ApiError(httpStatus.FORBIDDEN, "Forbidden"));
        }

        next();
    };
};

export default authorize;
