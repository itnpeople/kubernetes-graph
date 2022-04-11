import express			from "express"
import {Service}		from "./services"
import * as kubernetes	from "./kubernetes"
import { Cluster } from "@kubernetes/client-node";

const router = express.Router();

/**
 * Workloads
 */
router.get('/clusters', async (request:express.Request, response:express.Response) => {

	
	try {
		response.json(kubernetes.KubeConfig.instance().contexts);
	} catch (e:any) {
		console.log( e.message);
		response.status(500).json({ status:e.statusCode, message: e.message });
	}

});


/**
 * 토플로지
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

/**
 * Workloads
 */
router.get('/clusters/:cluster/workloads', async (request:express.Request, response:express.Response) => {

	try {
		let service:Service = new Service();
		let r = await service.workloads({cluster:request.params.cluster});

		response.json(Object.fromEntries(r));

	} catch (e:any) {
		console.log( e.message);
		response.status(500).json({ status:e.statusCode, message: e.message });
	}

});

module.exports = router;