import * as fs		from "fs"
import * as k8s 	from "@kubernetes/client-node"
import * as request	from "request-promise"

/**
 * Kubernetes API
 * 
 */
export class KubeConfig {

	private _kubeConfig:k8s.KubeConfig;
	private _options:any = {};
	private _server:string;

	/**
	 * 생성자
	 */
	constructor() {
		this._kubeConfig = new k8s.KubeConfig();
		if(fs.existsSync("/.kube/config")) {1
			this._kubeConfig.loadFromFile("/.kube/config");
			console.info("kubernetes config load from '/.kube/config'");
		} else {
			this._kubeConfig.loadFromDefault();
			console.info("kubernetes config load from default");
		}
		this.setCurrentContext(this._kubeConfig.getCurrentContext());
	}

	public config():k8s.KubeConfig {
		return this._kubeConfig;
	}

	/**
	 * 현재 Context 지정
	 */
	public setCurrentContext(context:string) {
		if(!context) return;
		this._kubeConfig.setCurrentContext(context);
		this._server = this._kubeConfig.getCurrentCluster()!.server;
		this._kubeConfig.applyToRequest(this._options);
	}

	/**
	 * 클라이언트 리턴
	 */
	public makeApiClient():k8s.CoreV1Api {
		return this.config().makeApiClient(k8s.CoreV1Api);
	}

	/**
	 * api raw 호출
	 */
	public async raw(url:string):Promise<any> {
		const body = await request.get(this._server + url, this._options);
		return JSON.parse(body);
	}

	private static _config:KubeConfig;

	/**
	 * Context(클러스터)별 K8s static 인스턴스 리턴
	 */
	public static instance(context?:string):KubeConfig {
		if(!this._config) this._config = new KubeConfig();
		if(context) this._config.setCurrentContext(context);
		return this._config;
	}

}
