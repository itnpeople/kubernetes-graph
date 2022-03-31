import * as k8s				from "@kubernetes/client-node"
import * as kubernetes		from "../utils/kubernetes"
import {Topology as model}	from "../../graph/model/graph.model"
/**
 * 클러스터 토플로지 데이터 모델
 */
export class Service {

	public async topology(params:any):Promise<model.Topology> {

		let topology:model.Topology = new model.Topology();
		
		if (!params || !params.clusters) return topology;

		for(let c in params.clusters) {
			let api:k8s.CoreV1Api = kubernetes.KubeConfig.instance(c).makeApiClient();


			// Cluster - Namespace 조건
			let namespaceList:string[] = [];
			if(typeof(params.clusters[c])=="string" && params.clusters[c] != "*")
				namespaceList = [params.clusters[c]];
			else if(params.clusters[c] instanceof Array) {
				namespaceList = params.clusters[c];
			} else {
				let itemList:k8s.V1NamespaceList = (await api.listNamespace()).body;
				for(let i=0; i < itemList.items.length; i++) namespaceList.push(itemList.items[i].metadata!.name!);
			}
			
			// namespace 리스트 조회
			let isSingleNS = (namespaceList.length ==1);	// 네임스페이스가 1개면 네임스페이스 노드는 hidden

			// 1. 네임스페이스
			for(let n=0; n < namespaceList.length; n++) {
				let ns = namespaceList[n];
				if(!ns) break;
				
				if(! isSingleNS) topology.nodes.push({id:ns, name:ns, kind:model.NodeKind.NAMESPACE, labels:"", group:ns}); //namespace

				// 파트
				let podList:k8s.V1PodList = (await api.listNamespacedPod(ns)).body;
				
				podList.items.forEach( (pod:k8s.V1Pod) => {

					let nm:any = pod.metadata!.name;
					if(pod.metadata!.generateName) {
						nm = /.*(?=-)/.exec(nm);
						nm = /.*(?=-)/.exec(nm);
					}
					topology.nodes.push({id:pod.metadata!.uid!, name:nm, kind:model.NodeKind.POD, labels:pod.metadata!.labels, group:ns});
					//if(! isSingleNS) topology.links.push({source: pod.metadata.namespace, target: pod.metadata.uid, hidden:false});	//namespace link

				});

				// 서비스
				let serviceList:k8s.V1ServiceList = (await api.listNamespacedService(namespaceList[n])).body;
				serviceList.items.forEach( (service:k8s.V1Service)=> {

					topology.nodes.push({id:service.metadata!.uid!, name:service.metadata!.name!,kind:model.NodeKind.SERVICE, group:ns});
					//if(! isSingleNS) topology.links.push({source: service.metadata.namespace, target: service.metadata.uid, hidden:true});	//namespace link

					// 서비스 - 파드 링크
					if(service.spec!.selector) {
						
						podList.items.forEach( (pod:k8s.V1Pod) => {

							let n = 0, len = Object.keys(service.spec!.selector!).length;
							for(let label in service.spec!.selector) {
								let key = label, val = service.spec!.selector[label];
								if(pod.metadata!.labels && pod.metadata!.labels[key] && pod.metadata!.labels[key]==val) n++;
								else break;
							};
							if(n == len) {
								//topology.links.push({source: pod.metadata.uid, target: service.metadata.uid, hidden:false});
							}

						});
					}


				});

				
			}

		}
		return topology;
	}
}


