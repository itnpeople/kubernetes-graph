import * as d3			from "d3";
import {Config}			from "@/components/graph/model/config.model";
import {Toolbar}		from "@/components/graph/toolbar";
import {Bounds, WH, UI}	from "@/components/graph/utils/ui";
import {Transform}		from "@/components/graph/utils/transform";
import {Lang}			from "@/components/graph/utils/lang";

/**
 * Graph 베이스 클래스
 */
export abstract class GraphBase {
	
	private m_config:Config = new Config();
	private m_container:HTMLElement;
	private m_on:any;

	public svg:d3.Selection<SVGSVGElement, any, SVGElement, any>;			//svg element
	public outlineWrapEl:d3.Selection<SVGGElement,any,SVGElement,any>;		//svg > g.outlineWrap
	public outlineEl:d3.Selection<SVGGElement,any,SVGElement,any>;			//svg > g.outlineWrap > g.outline
	public toolbarEl:d3.Selection<SVGGElement,any,SVGElement,any>			//svg > g.toolbar
	public zoomBehavior:d3.ZoomBehavior<any,any>;							//zoom
	public bounds:Bounds;													//outline bounds
	public initWH:WH														//initial width, height


	constructor(container?:string, conf?:Config) {
		if(container) this.container(container);
		if(conf) this.config(conf);
	}
	public container<T extends (GraphBase|HTMLElement)>(_?:string):T {
		return _ ? (this.m_container = d3.select<HTMLElement, any>(_).node()!, <T><unknown>this) : <T>this.m_container
	}
	public config<T extends (GraphBase|Config)>(_?:Config):T {
		return _ ? (this.m_config = new Config(), this.m_config = Lang.merge(this.m_config, _), <T><unknown>this) : <T>this.m_config;
	}
	public data(_?:any):GraphBase|any {
		return _ ? (this.m_config.data = _, this) : this.m_config.data;
	}
	public on(name?:string, func?:(this: SVGElement, event: any, d: any) => void):GraphBase|any {
		if (name && !this.m_on)  this.m_on = {};
		return name ? (this.m_on[name] = func, this) : this.m_on;
	}

	/**
	 * 주어진 데이터를 기준으로 그래프를 랜더링한다.
	 *
	 * @param container container HTML element 
	 * @param config config(with data)
	 */
	public render():GraphBase {

		if(arguments.length==1) this.config(arguments[0]);
		else if(arguments.length==2) (this.container(arguments[0]), this.config(arguments[1]));

		if(!this.m_container) return this;
		const containerEl:d3.Selection<any, any, any, any> = d3.select(this.m_container);
		const conf:Config = Lang.merge({}, this.config<Config>());
		if (this.on()) conf.on = Lang.merge(conf.on, this.on());

		// svg
		let svg:d3.Selection<SVGSVGElement, any, SVGElement, any> = containerEl.select<SVGSVGElement>("svg");
		if(svg.size() == 0) svg = containerEl.append("svg");
		if (conf.global.padding.top  != 0) svg.style("padding-top", conf.global.padding.top);
		if (conf.global.padding.bottom  != 0) svg.style("padding-bottom", conf.global.padding.bottom);
		if (conf.global.padding.left  != 0) svg.style("padding-left", conf.global.padding.left);
		if (conf.global.padding.right  != 0) svg.style("padding-right", conf.global.padding.right);
		this.svg = svg;

		// svg > g.outlineWrapEl  (resize 영역, svg 크기를 커버)
		const isOutlineWrap:boolean = !this.outlineWrapEl;
		if(isOutlineWrap) {
			const bounds:Bounds =  new Bounds(this.container<HTMLElement>());
			this.outlineWrapEl = svg.append("g").attr("class","outlineWrap");
			this.outlineWrapEl.append("rect").attr("class","background").attr("fill","transparent").attr("width",bounds.width).attr("height",bounds.height);
			this.initWH = {width:bounds.width, height:bounds.height};
		}

		// svg > g.outlineWrapEl > g.outline (zoom 영역, 그래프 랜더링 영역)
		this.outlineEl = this.outlineWrapEl.append("g").attr("class","outline");
		if(this.outlineEl.size() > 0) this.outlineWrapEl.selectAll("g.outline").remove();
		this.outlineEl = this.outlineWrapEl.append("g").attr("class","outline");


		// populate 
		if(conf.data) this.populate(this.outlineEl, Object.assign({}, this.initWH), conf);

		// g.outline align & bounds
		UI.align(this.outlineEl.node()!, conf.global.align.horizontal, conf.global.align.vertical);
		this.bounds = new Bounds(this.outlineEl);

		// Toolbar
		this.toolbarEl = Toolbar.render(this);

		// ZOOM Behavior
		this.zoomBehavior = d3.zoom().on("zoom", (event)=> { this.outlineEl.attr("transform", event.transform); });

		// ZOOM > 바인딩
		if(isOutlineWrap) this.outlineWrapEl.call(this.zoomBehavior);
		if(isOutlineWrap) this.outlineWrapEl.on("dblclick.zoom", null);	//zoom 더블클릭 이벤트 drop (because event bubbling)

		// Outline Transform > scale-ratio 옵션 반영
		if(conf.global.scale.ratio != 1) {
			this.zoom({k:conf.global.scale.ratio});
		} else {
			this.zoom();
		}

		// window resize event
		this.resize();
		if(isOutlineWrap) d3.select(window).on('resize.updatesvg', () => { this.resize(); } );

		return this;

	}

	/**
	 * size 반영
	 */
	protected resize() {

		// svg width & height & padding
		let bounds:Bounds = new Bounds(this.container<HTMLElement>());
		this.svg.attr("width", bounds.width).attr("height", bounds.height);


		// width, height 재 계산
		const conf:Config = this.config<Config>();
		if (conf.global.padding.left + conf.global.padding.right != 0) {
			bounds.width -= (conf.global.padding.left + conf.global.padding.right);
			bounds.height -= (conf.global.padding.top + conf.global.padding.bottom);
		}
		// g.outlineWrap > rect.background
		//this.outlineWrapEl.select("rect.background").attr("width",bounds.width).attr("height",bounds.height);

		// g.outlineWrap scale ratio
		let k:number = 1 
		if(this.initWH.width != bounds.width && this.initWH.height != bounds.height) k = Math.min(bounds.width/this.initWH.width, bounds.height/this.initWH.height);
		else if(this.initWH.width != bounds.width) k = bounds.width/this.initWH.width;
		else if(this.initWH.height != bounds.height) k = bounds.height/this.initWH.height;

		Transform.instance(this.outlineWrapEl.node()!).scale(k)
		UI.align(this.toolbarEl.node()!, conf.global.toolbar.align.horizontal, conf.global.toolbar.align.vertical, conf.global.toolbar.margin);

	}


	/**
	 * ZOOM
	 *	
	 * @param ratio 배율 (1보다 작으면 축소, 1보다 크면 확대)
	 */
	public zoom(z?:{x?:number,y?:number,k?:number}):GraphBase {

		let transform:d3.ZoomTransform = d3.zoomTransform(this.outlineEl.node()!);
		if (z) {
			// translate
			if(!z.x) z.x = transform.x;
			if(!z.y) z.y = transform.y;
			if(!z.k) z.k = transform.k;
		} else {
			// translate screen-fit
			const bounds:DOMRect = this.outlineEl.node()!.getBBox();
			const k:number = Math.min(bounds.width/this.bounds.width,bounds.height/this.bounds.height);
			z = {x:this.bounds.x, y:this.bounds.y, k:k};
		}
		this.outlineWrapEl.call(this.zoomBehavior.transform, d3.zoomIdentity.translate(z.x!, z.y!).scale(z.k!));

		return this;
	}

	/**
	 * ZOOM 계속 증감 처리
	 * 
	 * @param ratio 배율 (1보다 작으면 축소, 1보다 크면 확대, 현재 배율에 곱하기)
	 */
	public zoomRatio(ratio:number,minRatio?:number, maxRatio?:number):GraphBase {

		
		let transform:d3.ZoomTransform = d3.zoomTransform(this.outlineEl.node()!);
		let k:number = transform.k*ratio;

		const conf:Config = this.config<Config>();
		if (!minRatio) minRatio = conf.global.scale.minRatio;
		if (!maxRatio) maxRatio = conf.global.scale.maxRatio;

		if(minRatio > 0 && k < minRatio)  k = minRatio;	//최소배율
		if(maxRatio > 0 && k > maxRatio)  k = maxRatio;	//최대배율

		this.zoom({x: transform.x, y:transform.y, k:k})

		return this;
	}


	protected abstract populate(outlineEl:d3.Selection<SVGGElement,any,SVGElement,any>, wh:WH, conf:Config):void;

}
