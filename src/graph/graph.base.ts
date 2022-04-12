import * as d3		from "d3";
import * as d3Zoom	from "d3-zoom";
import {Config}		from "@/components/graph/model/config.model";
import {Bounds, UI}		from "@/components/graph/utils/ui";
import {Transform}	from "@/components/graph/utils/transform";
import {Lang}		from "@/components/graph/utils/lang";

/**
 * Graph 베이스 클래스
 */
export abstract class GraphBase {
	
	private _bounds:Bounds;
	private _outlineEl:SVGGElement;
	private _graphEl:d3.Selection<SVGGElement,any,SVGElement,any>;
	private _svg:d3.Selection<SVGSVGElement, any, SVGElement, any>;
	private _zoom:d3Zoom.ZoomBehavior<Element,any>;
	private _container:HTMLElement;
	private _config:Config = new Config();
	private _beforeAlign:{vertical:string, horizontal:string} = {vertical:"",horizontal:"" };

	constructor(el:HTMLElement, conf?:Config) {
		this._container = el;
		if(conf) this.config(conf);
	}

	public config(_?:Config):GraphBase|Config {
		return arguments.length ? (this._config = Lang.merge(this._config, _), this) : this._config;
	}
	public data(_?:any):GraphBase|any {
		return arguments.length ? (this._config.data = _, this) : this._config.data;
	}
	public bounds(_?:Bounds):any {
		return arguments.length ? (this._bounds = _!, this): this._bounds;
	}
	protected outlineEl(_?:SVGGElement):any {
		return arguments.length ? (this._outlineEl = _!, this): this._outlineEl;
	}
	protected outlineWrapEl(_?:d3.Selection<SVGGElement,any,SVGElement,any>):any {
		return arguments.length ? (this._graphEl = _!, this): this._graphEl;
	}
	public svg(_?:d3.Selection<SVGSVGElement, any, SVGElement, any>):any {
		return arguments.length ? (this._svg = _!, this): this._svg;
	}
	public container(_?:HTMLElement):any {
		return arguments.length ? (this._container = _!, this): this._container;
	}
	public zoomBehavior(_?:d3Zoom.ZoomBehavior<Element,any>):any {
		return arguments.length ? (this._zoom = _!, this): this._zoom;
	}
	

	/**
	 * 주어진 데이터를 기준으로 그래프를 랜더링한다.
	 * @param data 
	 */
	public render():GraphBase {

		if(arguments.length==1) this.config(arguments[0]);
		else if(arguments.length==2) (this._container = arguments[0], this.config(arguments[1]));

		if(!this._container) return this;
		let container:d3.Selection<any, any, any, any> = d3.select(this._container);
		
		// svg
		let svg:d3.Selection<SVGSVGElement, any, SVGElement, any> = container.select<SVGSVGElement>("svg");
		if(svg.size() == 0) svg = container.append("svg");

		//bound 계산, padding 반영
		let bounds:Bounds =  new Bounds(container);

		// svg 크기 지정
		svg.attr("width", bounds.width).attr("height", bounds.height);


		let outlineWrapEl:d3.Selection<SVGGElement,any,SVGElement,any> = svg.select("g.outlineWrap");
		let outlineEl:d3.Selection<SVGGElement,any,SVGElement,any>;
		let attrTransform:string = "";
		const conf:Config = <Config>this.config();

		// size 재 계산
		if (conf.global.padding.left + conf.global.padding.right != 0) {
			bounds.width -= (conf.global.padding.left + conf.global.padding.right);
			bounds.height -= (conf.global.padding.top + conf.global.padding.bottom);
		}

		if(outlineWrapEl.size() > 0) {
			// 이전에 outline 이 있다면  
			// 		- 이전에 정렬정보가 변경되지 않고
			//		- transform 속성값을 삭제하기 전에 저장하여 나중에 재 설정해준다.
			outlineEl = svg.select<SVGGElement>("g.outline");
			if(outlineEl.size() > 0) {
				attrTransform = (this._beforeAlign.vertical  != this._config.global.align.vertical ||  this._beforeAlign.horizontal  != this._config.global.align.horizontal ) ? "": outlineEl.attr("transform")
				outlineEl.remove();
			}
			this._beforeAlign  = Object.assign({}, this._config.global.align);

		} else {
			// g.outlineWrap > g.outline 추가 
			//		- 그래프는 g.outline 에 추가됨
			//		- g.outlineWrapEl 는 zoom 영역임, svg 크기를 커버
			outlineWrapEl = svg.append("g").attr("class","outlineWrap");
			outlineWrapEl.append("rect").attr("class","background").attr("width",bounds.width).attr("height",bounds.height).attr("fill","transparent")
		}

		// padding
		outlineEl = outlineWrapEl.append("g").attr("class","outline");
		if (conf.global.padding.top  != 0) svg.style("padding-top", conf.global.padding.top);
		if (conf.global.padding.bottom  != 0) svg.style("padding-bottom", conf.global.padding.bottom);
		if (conf.global.padding.left  != 0) svg.style("padding-left", conf.global.padding.left);
		if (conf.global.padding.right  != 0) svg.style("padding-right", conf.global.padding.right);

		// 멤버변수들
		this.bounds(bounds);
		this.outlineEl(outlineEl.node()!);
		this.svg(svg);
		this.container(container.node());
		this.outlineWrapEl(outlineWrapEl);

		// 데이터 모델 구성 후 그려주기
		this.populate(outlineEl, bounds, conf);

		//scale-ratio 옵션 반영
		if(conf.global.scale.ratio != 1) {
			Transform.instance(this.outlineEl()).ratioScale(conf.global.scale.ratio);
		}

		// 이전에 outline 이 있다면  이전 속성값 다시 지정하고 수직, 수평정렬은 수행하지 않는다.
		if(attrTransform) outlineEl.attr("transform",attrTransform);
		else {
			if(conf.global.align.horizontal=="center") UI.alignHorizontal(outlineEl.node()!);	// outline 수평 정렬
			if(conf.global.align.vertical=="middle") UI.alignVertical(outlineEl.node()!);	// outline 수직 정렬
		}


		// ZOOM
		this.zoomBehavior(
			d3Zoom.zoom().on("zoom", (event)=> {
				outlineEl.attr("transform", event.transform);  
			})
		);

		// ZOOM 가운데 정렬에 따를 초기화
		let transform:Transform = Transform.instance(this.outlineEl());
		outlineWrapEl.call(this.zoomBehavior().transform, d3Zoom.zoomIdentity.translate(transform.x, transform.y).scale(transform.k));

		// ZOOM 바인딩
		outlineWrapEl.call(this.zoomBehavior());
		outlineWrapEl.on("dblclick.zoom", null);	//zoom 더블클릭 이벤트 drop (because event bubbling)
		return this;

	}

	/**
	 * ZOOM 계속 증감 처리
	 * 
	 * @param ratio 배율 (1보다 작으면 축소, 1보다 크면 확대)
	 */
	public zoomRatio(ratio:number,range?:Array<number>):GraphBase {

		let transform = d3Zoom.zoomTransform(this.outlineWrapEl().node());
		let k:number = transform.k*ratio;
		if(range) {
			if(transform.k < range[0])  k = range[0];	//최소배율
			if(transform.k > range[1])  k = range[1];	//최대배율
		}

		this.outlineWrapEl().call(this.zoomBehavior().transform, d3Zoom.zoomIdentity.translate(transform.x, transform.y).scale(k));

		return this;
	}


	/**
	 * ZOOM
	 * 
	 * @param k 배율 (0 이면 SVG에 맞춤)
	 */
	public zoom(k?:number):GraphBase {

		if(k) {
			let transform = d3Zoom.zoomTransform(this.outlineWrapEl().node());
			this.outlineWrapEl().call(this.zoomBehavior().transform, d3Zoom.zoomIdentity.translate(transform.x, transform.y).scale(k));
		} else {

			Transform.instance(this.outlineEl()).translate(0,0).ratioScale(1);	//초기화

			let rect = this.outlineEl().getBoundingClientRect();
			let bounds:DOMRect =  this.bounds();
			
			let transform:Transform = new Transform(this.outlineEl());

			rect.width = rect.width * 1/transform.k;
			rect.height = rect.height * 1/transform.k;
			transform.k = 1;

			// k 결정 (너비, 높이)
			if(rect.width>bounds.width) transform.k = bounds.width/rect.width;
			if(rect.height>bounds.height && transform.k>bounds.height/rect.height) transform.k = bounds.height/rect.height;
			
			// x,y 축 이동 (가운데 정렬)
			transform.x = (bounds.width-(rect.width*transform.k))/2-rect.x;
			transform.y = (bounds.height-(rect.height* transform.k))/2-rect.y;

			this.outlineWrapEl().call(this.zoomBehavior().transform, d3Zoom.zoomIdentity.translate(transform.x, transform.y).scale(transform.k==0?1:transform.k));
		}

		return this;
	}

	/**
	 * 리사이즈 처리
	 * 
	 */
	public resize() {

		if(!this.bounds()) return;
		
		let w:number = this.bounds().width;
		let h:number = this.bounds().height;
		let transform:Transform = Transform.instance(this._outlineEl);

		let b:ClientRect = this._container.getBoundingClientRect();
		this.svg().attr("width", b.width).attr("height", b.height);
		this.outlineWrapEl().select("rect.background").attr("width", b.width).attr("height", b.height);	// g.outllieWrap > rect.background 엘리먼트 크기도 조정

		w = (b.width == w ? 1: b.width/ w);
		h = (b.height== h ? 1: b.height/ h);
		let k:number = Math.min(w,h);
		if(k==1) return;

		transform.x = transform.x* k
		transform.y = transform.y* k
		transform.k = transform.k* k

		this.outlineWrapEl().call(this.zoomBehavior().transform, d3Zoom.zoomIdentity.translate(transform.x, transform.y).scale(transform.k==0?1:transform.k));
		this.bounds(<DOMRect>this._container.getBoundingClientRect());

	}
	
	protected abstract populate(outlineEl:d3.Selection<SVGGElement,any,SVGElement,any>, bounds:Bounds, conf:Config):void;

}
