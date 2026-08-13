/// <reference types="node" />

import { v2 as cloudinary } from "cloudinary";

export default function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const timestamp = Math.round(
      new Date().getTime() / 1000
    );

    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
      },
      process.env.CLOUDINARY_API_SECRET as string
    );

    return res.status(200).json({
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    });
  } catch (error) {
    console.error("Cloudinary signing error:", error);

    return res.status(500).json({
      error: "Unable to create Cloudinary signature",
    });
  }
}