// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { Author, Post, PostDTO } from "@/types";
import type { NextApiRequest, NextApiResponse } from "next";
import * as fs from "fs";
import { OAuth2Client } from "google-auth-library";
import { config } from "@/config";

// CRUD
const FILE_PATH = "src/db/posts.json";

const extractJWTFromReq = (req: NextApiRequest) => {
  const headers = req.headers;
  const authorization = headers["authorization"];
  const accessToken = authorization
    ? authorization.replace("Bearer ", "").trim()
    : "";
  return accessToken;
};

const getDecodedOAuthJwtGoogle = async (token: string) => {
  try {
    const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: config.GOOGLE_CLIENT_ID,
    });

    return ticket;
  } catch (error) {
    console.error("Error decoding JWT", error);
    return null;
  }
};

async function handleGetPosts(res: NextApiResponse<Post[]>) {
  const posts = await fs.readFileSync(FILE_PATH);
  return res.status(200).json(JSON.parse(posts.toString()));
}

async function handleCreatePost(
  req: NextApiRequest,
  res: NextApiResponse<PostDTO[] | null>
) {
  const postsStr = await fs.readFileSync(FILE_PATH);
  const posts: Post[] = JSON.parse(postsStr.toString());

  const dto: PostDTO = req.body;
  const jwt = extractJWTFromReq(req);
  const ticket = await getDecodedOAuthJwtGoogle(jwt);

  if (!ticket) {
    return res.status(401).send(null);
  } else {
    const payload = ticket.getPayload();

    const author: Author = {
      avatar: payload?.picture || "",
      name: payload?.name || "",
      username: payload?.email || "",
    };

    const newPost: Post = {
      author,
      content: dto.content,
      followers: 0,
      followings: 0,
    };

    posts.push(newPost);

    fs.writeFileSync(FILE_PATH, JSON.stringify(posts));
    return res.status(200).json(posts);
  }
}

// HTTP Method -> GET, POST, PUT/PATCH, DELETE
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<PostDTO[] | null>
) {
  const method = req.method;
  switch (method) {
    case "GET":
      return handleGetPosts(res);
    case "POST":
      handleCreatePost(req, res);
    default:
      return "Error";
  }
}
