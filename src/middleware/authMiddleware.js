import jwt from 'jsonwebtoken';
import { getUserById } from '../repositories/userRepository.js';

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token
            req.user = await getUserById(decoded.id);

            next();
        } catch (error) {
            const err = new Error('Not authorized');
            err.statusCode = 401;
            next(err);
        }
    }

    if (!token) {
        const err = new Error('Not authorized, no token');
        err.statusCode = 401;
        next(err);
    }
};

export { protect };