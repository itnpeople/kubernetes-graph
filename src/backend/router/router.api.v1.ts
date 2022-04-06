import express			from "express"
import * as model		from "../../graph/model/graph.model"
import {Service}		from "../model/topology.model"
import {KubeConfig}		from "../utils/kubernetes"

const router = express.Router();
const ISTIO_NAMESPACE = process.env.ISTIO_NAMESPACE || "istio-system"


/**
 * Rbac 토플로지
 * 
 * 
 */
router.all('/clusters/:context/rbac', async (request:express.Request, response:express.Response) => {

	const kube:KubeConfig = KubeConfig.instance(request.params.context);
	const id = Math.random().toString(18);
	let nodes:Array<any> = [{
		id: id,
		name: request.body.name,
		kind: request.body.kind.toLowerCase(),
	}];
	let links:Array<any> = [];


	(await kube.raw("/apis/rbac.authorization.k8s.io/v1/clusterrolebindings"))
		.items
		.forEach((d:any)=>{
			for(let n in d.subjects) {
				if((d.subjects[n].kind==request.body.kind) && d.subjects[n].name == request.body.name ) {
					const source = Math.random().toString(18), target=Math.random().toString(18);
					nodes.push({
						id: target,
						name:d.metadata.name,
						kind:model.Topology.NodeKind.CLUSTER_ROLEBINDING
					});
					nodes.push({
						id: source,
						name:d.roleRef.name,
						kind:d.roleRef.kind.toLowerCase()
					});
					links.push({source:id, target:target});
					links.push({source:source, target:target});
				}
			}
		});

	(await kube.raw("/apis/rbac.authorization.k8s.io/v1/rolebindings"))
		.items
		.forEach((d:any)=>{
			for(let n in d.subjects) {
				if((d.subjects[n].kind==request.body.kind) && d.subjects[n].name == request.body.name ) {
					const source = Math.random().toString(18), target=Math.random().toString(18);
					nodes.push({
						id: target,
						name:d.metadata.name,
						kind:model.Topology.NodeKind.ROLEBINDING
					});
					nodes.push({
						id: source,
						name:d.roleRef.name,
						kind:d.roleRef.kind.toLowerCase()
					});
					links.push({source:id, target:target});
					links.push({source:source, target:target});
				}
			}
		});

	response.json({nodes:nodes, links:links});


});

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
router.all('/topology', async (request:express.Request, response:express.Response) => {

	try {
		let service:Service = new Service();
		let r = await service.topology(request.body);
		response.json(r);

	} catch (e:any) {
		console.log( e.message);
		response.status(500).json({ status:e.statusCode, message: e.message });
	}

});

module.exports = router;