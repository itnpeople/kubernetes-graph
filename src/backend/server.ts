import express	from "express"
import cors		from "cors";

/**
 * 제공 서비스
 * 	- api-server bridge restful api
 * 	- business logic restful api
 * 	- 프로토타입 웹페이지
 */
const app = express(),
	PORT = process.env.PORT || 4000
//const router = express.Router();


// Restful API
app.use(cors());
app.use(express.json());
//app.use(express.static("public"));	//static

//// 인덱스 페이지
app.get("/", (req:any, res:any) => res.send("Hello World!"));
app.use("/api",		require("./router.api.v1"));	//RestfulAPI

app.listen(PORT, () => {
	console.log(`PORT = ${PORT}`)
})
