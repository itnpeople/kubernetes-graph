import * as fs		from "fs"
import * as yaml	from "yaml"
import * as request	from "request-promise"
import * as model	from "../../graph/model/graph.model"

/**
 * Kiali config 파일 모델
 */
export namespace KialiConfigModel {
	export class Cluster {
		server:string
		auth:{
			strategy:string
		}
	}
	export class User {
		username:string
		passphrase:string
	}
	export class Context {
		cluster:string
		user?:string
	}

}

/**
 * Kiali 설정 유틸
 */
export class KialiConfig {

	private _clusters:{[key: string]: KialiConfigModel.Cluster} = {};
	private _contexts:{[key: string]: KialiConfigModel.Context} = {};
	private _users:{[key: string]: KialiConfigModel.User} = {};
	private _current_context:string;

	/**
	 * config 로딩
	 *		- ~/.kube/kiali 가 없으면 /.kube/kiali 파일을 찾는다.
	 */
	public loadFromDefault():KialiConfig {

		const filePath:string = fs.existsSync(`${require('os').homedir()}/.kube/kiali`)? `${require('os').homedir()}/.kube/kiali`: "/.kube/kiali";
		
		if( fs.existsSync(filePath)) {

			const file = fs.readFileSync(filePath, "utf8")
			const doc = yaml.parse(file);
			if(doc["clusters"]) doc["clusters"].forEach( (c:any)=> this._clusters[c.name] = c.cluster);
			if(doc["contexts"]) doc["contexts"].forEach( (c:any)=> this._contexts[c.name] = c.context);
			if(doc["users"]) doc["users"].forEach( (c:any) => {
				this._users[c.name] = {
					username: Buffer.from(c.user.username, "base64").toString("ascii"),
					passphrase:Buffer.from(c.user.passphrase, "base64").toString("ascii")
				};
			});
			if(doc["contexts"].length==1) this.setCurrentContext(doc["contexts"][0].name);
			else this.setCurrentContext(doc["current-context"] ? doc["current-context"]: doc["contexts"][0].name);

		} else {
			console.error(`config error(path=${filePath})`);
		}

		return this;
	}
	public contexts() {
		return this._contexts;
	}
	public makeApiClient():KialiApi {
		return new KialiApi(this.getCurrentCluster(),this.getCurrentUser());
	}
	public getCurrentCluster():KialiConfigModel.Cluster {
		return this._clusters[this._contexts[this.getCurrentContext()].cluster];
	}
	public getCurrentUser(): KialiConfigModel.User {
		return this._users[this._contexts[this.getCurrentContext()].user!];
	}
	public getCurrentContext(): string {
		return this._current_context;
	}
	public setCurrentContext(name:string):void {
		this._current_context = name;
	}

	private static _kialiConfig:KialiConfig;
	/**
	 * Context(클러스터)별 Kiali static 인스턴스 리턴
	 */
	public static instance(context?:string):KialiConfig {
		if(!this._kialiConfig) {
			this._kialiConfig = new KialiConfig();
			this._kialiConfig.loadFromDefault();
		}
		if(context) this._kialiConfig.setCurrentContext(context);
		return this._kialiConfig;
	}
		
}

/**
 * Kiali api 
 */
export class KialiApi {
	
	private _cluster:KialiConfigModel.Cluster
	private _user:KialiConfigModel.User
	private static TOKEN:string

	constructor(cluster:KialiConfigModel.Cluster, user:KialiConfigModel.User) {
		this._cluster = cluster;
		this._user = user;
	}

	/**
	 * Basic 인증 (authenticate)
	 *   - username, password
	 */
	public async authenticate():Promise<string> {

		const basic:string = Buffer.from(`${this._user.username}:${this._user.passphrase}`).toString("base64");
		const headers = { "Authorization": `Basic ${basic}` };

		const url = `${this._cluster.server}/api/authenticate`;

		let r = await request.get(url, { headers: headers, method: "GET", json: true });
		console.log("authenticate", r);

		return r.token;

	}

	/**
	 * TOKEN Bearer 인증을 적용한 HTTP 헤더 리턴
	 */
	private async options():Promise<any> {

		const options:any = {method: "GET", json: true };

		// 로그인 방식일 경우는 authenticate()을 통해 token을 얻고 Bearer 헤더를 추가해준다. 
		if(this._cluster.auth.strategy == "login") {
			if(!KialiApi.TOKEN) KialiApi.TOKEN = await this.authenticate();
			options["headers"] = {"Authorization": `Bearer ${KialiApi.TOKEN}`}
		}

		return options;
	}

	/**
	 * namespace 리스트
	 */
	public async namespaces():Promise<any> {

		const url:string = `${this._cluster.server}/api/namespaces`;
		return await this.get(url);

	}


	/**
	 * namespace 내 apps 조회
	 */
	public async apps(namespace:string):Promise<any> {

		const url:string = `${this._cluster.server}/api/namespaces/${namespace}/apps`;
		return await this.get(url);

	}

	/**
	 * 그래프 데이터 조회
	 */
	public async graph(args:{duration:string, namespaces:string, graphType?:string, injectServiceNodes:boolean, appenders?:string, groupBy?:string, queryTime?:string}):Promise<model.Kiali.Graph> {

		const url:string = `${this._cluster.server}/api/namespaces/graph?duration=${args.duration}&namespaces=${args.namespaces}&graphType=${args.graphType?args.graphType:"app"}&injectServiceNodes=${args.injectServiceNodes}&queryTime=${args.queryTime?args.queryTime:""}&groupBy=app&appenders=deadNode,sidecarsCheck,serviceEntry,istio${args.appenders?","+args.appenders:""}`;

		return await this.get(url);

	}

	/**
	 * 헬스체크
	 * 
	 * @param args.app 1개 app 대상
	 * @param args.type "app"|"service"|"workload", 해당 네임스페이스 내의 전체 app 또는 service 조회
	 */
	public async health(args:{namespace:string, interval:string, apps?:string, type?:string}):Promise<model.Kiali.HealthDictionary> {
		
		let h:model.Kiali.HealthDictionary = {};

		if(args.type) {
			const url:string = `${this._cluster.server}/api/namespaces/${args.namespace}/health?type=${args.type}&rateInterval=${args.interval}`;
			h = await this.get(url);
		} else {
			const url:string = `${this._cluster.server}/api/namespaces/${args.namespace}/apps/${args.apps}/health?rateInterval=${args.interval}`
			h[args.apps!] = await this.get(url);
		}

		return h;

	}
	
	public async get(url:string):Promise<any> {
		try{
			return await request.get(url, await this.options());
		} catch (e:any) {
			if(e.statusCode==406) {
				// 406 Not Acceptable 이면 인증키 다시한번 조회되도록 TOKEN 값 리셋
				KialiApi.TOKEN = "";
				return await request.get(url, await this.options());
			} else {
				throw e;
			}
		}

	}

}
