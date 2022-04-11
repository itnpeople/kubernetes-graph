import * as k8s							from "@kubernetes/client-node"
import * as kubernetes					from "./kubernetes"
import {TopologyModel, HierarchyModel}	from "../graph/model/graph.model"
import { V1Container } 					from "@kubernetes/client-node";

/**
 * Business-Logic
 */
export class Service {


	public async workloads(params:{cluster:string}):Promise<HierarchyModel.Hierarchy> {

		const api:k8s.CoreV1Api = kubernetes.KubeConfig.instance(params.cluster).makeApiClient(k8s.CoreV1Api);
		const apps:k8s.AppsV1Api = kubernetes.KubeConfig.instance(params.cluster).makeApiClient(k8s.AppsV1Api);

		const nsList:k8s.V1NamespaceList = (await api.listNamespace()).body;

		let workloads:HierarchyModel.Hierarchy = new HierarchyModel.Hierarchy();

		for(let i =0; i < nsList.items.length; i++) {
			const ns:string = nsList.items[i].metadata?.name!

			const pods:k8s.V1PodList = (await api.listNamespacedPod(ns)).body;
			const deployments:k8s.V1DeploymentList = (await apps.listNamespacedDeployment(ns)).body;
			const deamonsets:k8s.V1DaemonSetList = (await apps.listNamespacedDaemonSet(ns)).body;
			const replicasets:k8s.V1ReplicaSetList = (await apps.listNamespacedReplicaSet(ns)).body;


			let nodes:Array<HierarchyModel.Node> =  new Array<HierarchyModel.Node>();
			//deployment-nodes
			deployments.items.forEach( (el:k8s.V1Deployment)=> {
				nodes.push(new HierarchyModel.Node("Deployment", el.metadata))
			});
			//deamonsets-nodes
			deamonsets.items.forEach( (el:k8s.V1DaemonSet)=> {
				nodes.push(new HierarchyModel.Node("DaemonSet", el.metadata))
			});
			//replicasets-nodes
			replicasets.items.forEach( (el:k8s.V1ReplicaSet)=> {
				nodes.push(new HierarchyModel.Node("ReplicaSet", el.metadata))
			});
			//pod-nodes
			pods.items.forEach( (el:k8s.V1Pod)=> {
				const nd = new HierarchyModel.Node("Pod", el.metadata);
				nd.depth = 2
				nodes.push(nd)
			});



			workloads.set(ns, nodes)
		}

		return workloads;

	}

	public async topology(params:{cluster:string}):Promise<TopologyModel.Topology> {

		let topology:TopologyModel.Topology = new TopologyModel.Topology();
		if (!params || !params.cluster) return topology;

		const api:k8s.CoreV1Api = kubernetes.KubeConfig.instance(params.cluster).makeApiClient(k8s.CoreV1Api);
		const clusterList:k8s.V1NodeList = (await api.listNode()).body;

		// Cluster
		topology.nodes.push({ 
			id: params.cluster,
			name: params.cluster,
			kind:TopologyModel.NodeKind.CLUSTER,
			group:""
		});

		// Nodes
		clusterList.items.forEach( (el:k8s.V1Node) => {
			topology.nodes.push({ 
				id: el.metadata!.name!,
				name: el.metadata!.name!,
				kind:TopologyModel.NodeKind.NODE,
				//labels:el.metadata!.labels,
				group:el.metadata!.name!
			});

			topology.links.push({
				source: el.metadata!.name!,
				target: params.cluster,
				kind: TopologyModel.NodeKind.NODE,
				hidden:false
			});


		});

	
		// Cluster  조건
		const namespaceList:k8s.V1NamespaceList = (await api.listNamespace()).body;

		for(let i =0; i < namespaceList.items.length; i++) {
			const ns = namespaceList.items[i].metadata!.name!
			const podList:k8s.V1PodList =  (await api.listNamespacedPod(ns)).body
			podList.items.forEach( (pod:k8s.V1Pod) => {

				topology.nodes.push({
					id:pod.metadata!.uid!,
					name:pod.metadata!.name!,
					kind:TopologyModel.NodeKind.POD,
					group:pod.spec!.nodeName!
				});

				topology.links.push({
					source: pod.spec!.nodeName,
					target: pod.metadata!.uid!,
					kind: TopologyModel.NodeKind.POD,
					hidden:false
				});

				pod.spec!.containers.forEach( (c:V1Container) => {
					topology.nodes.push({
						id: `${pod.metadata!.uid}.${c.name}`,
						name:c.name,
						kind:TopologyModel.NodeKind.CONTAINER,
						group:pod.spec!.nodeName!
					});

					topology.links.push({
						source: `${pod.metadata!.uid}.${c.name}`,
						target: pod.metadata!.uid!,
						kind: TopologyModel.NodeKind.CONTAINER,
						hidden:false
					});
				});
				

			});
		}

		return topology;
	}
}


