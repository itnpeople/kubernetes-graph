import express			from "express"
import {Service}		from "./models"

const router = express.Router();

/**
 * Cluster 토플로지 API
 * 
 * @param
 * 	{
 * 		"acorn-demo": ["cocktail-addon","cocktail-cloud-kr-dev","cocktail-controller"],
 * 		"acorn-rnd": "*",
 * 		"apps-demo": "default"
 * 	}
 */
router.get('/clusters/:cluster/topology', async (request:express.Request, response:express.Response) => {

	try {
		let service:Service = new Service();
		let r = await service.topology({cluster:request.params.cluster});
		response.json(r);

	} catch (e:any) {
		console.log( e.message);
		response.status(500).json({ status:e.statusCode, message: e.message });
	}

});

module.exports = router;