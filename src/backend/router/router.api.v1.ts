import express			from "express"
import * as kiali		from "../utils/kiali"
import * as model		from "../../graph/model/graph.model"
import {Service}		from "../model/topology.model"
import {KubeConfig}		from "../utils/kubernetes"

const router = express.Router();
const ISTIO_NAMESPACE = process.env.ISTIO_NAMESPACE || "istio-system"

/**
 * 해당 namespace 의 apps health 체크
 * 
 * @param request.query.interval 조회기간 (예: 21600s)
 */
router.all('/clusters/:context/namespaces/:namespace/apps/:apps/health', async(request:express.Request, response:express.Response) => {

	try {

		let api:kiali.KialiApi = kiali.KialiConfig.instance(request.params.context).makeApiClient();
		let r:any = await api.health( {
			namespace: request.params.namespace,
			interval: <string>request.query.interval,
			apps: request.params.apps
		});
		response.json(r);

	} catch (e:any) {
		response.status(500).json({ status:e.statusCode, message: e.message });
	}

});

/**
 * 해당 namespace 의 apps health 체크
 * 
 * @param request.query.interval 조회기간 (예: 21600s)
 * @param request.query.type "app"|"service"
 */
router.all('/clusters/:context/namespaces/:namespace/health', async(request:express.Request, response:express.Response) => {

	try {

		let api:kiali.KialiApi = kiali.KialiConfig.instance(request.params.context).makeApiClient();
		let r:any = await api.health( {
			namespace: request.params.namespace,
			interval: <string>request.query.interval,
			type: <string>request.query.type
		});
		response.json(r);

	} catch (e:any) {
		response.status(500).json({ status:e.statusCode, message: e.message });
	}

});


/**
 * 그래프 조회
 * 		kiali 그래프 데이터 조회하고 네임스페이스별로 node 에 대한 health 정보를 추가한다.
 * 
 * @param
 * 	{
 *		"appenders": "",
 *		"duration": "21600s",
 *		"graphType": "versionedApp",
 *		"includeIstio": false,
 *		"injectServiceNodes": true,
 *		"groupBy": ""
 *		"namespaces": "default"
 * 	}
 */
router.all("/clusters/:context/mesh", async (request:express.Request, response:express.Response) => {

	try {
		const api:kiali.KialiApi = kiali.KialiConfig.instance(request.params.context).makeApiClient();
 
		// Kiali API 호출 - graph 정보 조회
		const g:model.Kiali.Graph = await api.graph({
			duration : request.body.duration,
			namespaces : request.body.namespaces,
			graphType : request.body.graphType,
			injectServiceNodes : request.body.injectServiceNodes,
			groupBy: request.body.groupBy,
			appenders : request.body.appenders});

		// health 정보 조회
		let health:{ 
			app: {[key:string]:model.Kiali.HealthDictionary},
			workload: {[key:string]:model.Kiali.HealthDictionary},
			services: {[key:string]:model.Kiali.HealthDictionary}
		} = {app:{}, workload:{}, services:{}}

		// 대상 namespace
		const nsList:Array<string> = request.body.namespaces.split(",");
		

		//Kiali API 호출 -  대상 네임스페이스별로 health 조회
		//		- app : app, versionedApp
		//		- workload : workload, versionedApp
		//		- service : service, injectServiceNodes=false
		for(let i=0; i < nsList.length; i++) {
			const ns:string = nsList[i];

			if(request.body.graphType == "app" || request.body.graphType == "versionedApp") health.app[ns]  = await api.health({namespace:ns, interval:request.body.duration, type:"app"})
			if(request.body.graphType == "workload" || request.body.graphType == "versionedApp") health.workload[ns]  = await api.health({namespace:ns, interval:request.body.duration, type:"workload"})
			if(request.body.injectServiceNodes == true || request.body.graphType == "service") health.services[ns]  = await api.health({namespace:ns, interval:request.body.duration, type:"service"})

		}

		//Kiali API 호출 -  istio 네임스페이스 health 조회
		//		- app : app
		//		- workload : workload, versionedApp, service
		//		- service : service, injectServiceNodes=false
		if(request.body.graphType == "app") health.app[ISTIO_NAMESPACE]  = await api.health({namespace:ISTIO_NAMESPACE, interval:request.body.duration, type:"app"})
		if(request.body.graphType == "workload" || request.body.graphType == "versionedApp" || request.body.graphType == "service") health.workload[ISTIO_NAMESPACE]  = await api.health({namespace:ISTIO_NAMESPACE, interval:request.body.duration, type:"workload"})
		if(request.body.injectServiceNodes == "false" || request.body.graphType == "service") health.services[ISTIO_NAMESPACE]  = await api.health({namespace:ISTIO_NAMESPACE, interval:request.body.duration, type:"service"})

		// graph  + health 합쳐 nodes 엘리먼트에 추가
		g.elements.nodes.forEach( (el:{data:model.Kiali.Node}) => {

			const ns:string = el.data.namespace;
			
			if(el.data.nodeType=="service" && health.services[ns]) el.data.health = health.services[ns][el.data.service!];
			else if(el.data.workload && health.workload[ns]) el.data.health = health.workload[ns][el.data.workload];
			else if(el.data.nodeType=="app" && health.app[ns]) el.data.health = health.app[ns][el.data.app];

		});

		response.json(g);

		// if(process.env.NODE_ENV == "development") {
		// 	response.json(g);	// 개발 모드일 경우는 원본 그대로 (@arcorn-graph/graph/graph.mesh.ts)
		// } else {
		// 	response.json( KialiParser.instance(g).parse() );
		// }

	} catch (e:any) {
		response.status(500).json({ status:e.statusCode, message: e.message });
	}

});

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