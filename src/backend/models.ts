import * as k8s					from "@kubernetes/client-node"
import * as kubernetes			from "./kubernetes"
import {TopologyModel as model}	from "../graph/model/graph.model"
import { V1Container } from "@kubernetes/client-node";
/**
 * 클러스터 토플로지 데이터 모델
 */
export class Service {

	public async topology(params:{cluster:string}):Promise<model.Topology> {

		let topology:model.Topology = new model.Topology();
		if (!params || !params.cluster) return topology;

		let api:k8s.CoreV1Api = kubernetes.KubeConfig.instance(params.cluster).makeApiClient();
		const clusterList:k8s.V1NodeList = (await api.listNode()).body;

		// Cluster
		topology.nodes.push({ 
			id: params.cluster,
			name: params.cluster,
			kind:model.NodeKind.CLUSTER,
			group:""
		});

		// Nodes
		clusterList.items.forEach( (el:k8s.V1Node) => {
			topology.nodes.push({ 
				id: el.metadata!.name!,
				name: el.metadata!.name!,
				kind:model.NodeKind.NODE,
				//labels:el.metadata!.labels,
				group:el.metadata!.name!
			});

			topology.links.push({
				source: el.metadata!.name!,
				target: params.cluster,
				kind: model.NodeKind.NODE,
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
					kind:model.NodeKind.POD,
					group:pod.spec!.nodeName!
				});

				topology.links.push({
					source: pod.spec!.nodeName,
					target: pod.metadata!.uid!,
					kind: model.NodeKind.POD,
					hidden:false
				});

				pod.spec!.containers.forEach( (c:V1Container) => {
					topology.nodes.push({
						id: `${pod.metadata!.uid}.${c.name}`,
						name:c.name,
						kind:model.NodeKind.CONTAINER,
						group:pod.spec!.nodeName!
					});

					topology.links.push({
						source: `${pod.metadata!.uid}.${c.name}`,
						target: pod.metadata!.uid!,
						kind: model.NodeKind.CONTAINER,
						hidden:false
					});
				});
				

			});
		}

		return topology;
	}
}


