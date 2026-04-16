import jwt from "jsonwebtoken";

export default function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header)
    return res.status(401).json({ message: "No token, access denied" });

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info from token
    req.user = decoded.id;
    req.userRole = decoded.role; // needed for staff/admin checks

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}