import * as d3		from "d3";
import {Config}		from "@/components/graph/model/config.model";
import {Toolbar}	from "@/components/graph/toolbar";
import {Bounds, UI}	from "@/components/graph/utils/ui";
import {Transform}	from "@/components/graph/utils/transform";
import {Lang}		from "@/components/graph/utils/lang";

/**
 * Graph 베이스 클래스
 */
export abstract class GraphBase {
	
	private _bounds:Bounds;
	private _outlineEl:d3.Selection<SVGGElement,any,SVGElement,any>;
	private _outlineWrapEl:d3.Selection<SVGGElement,any,SVGElement,any>;
	private _svg:d3.Selection<SVGSVGElement, any, SVGElement, any>;
	private _zoomBehavior:d3.ZoomBehavior<any,any>;
	private _container:HTMLElement;
	private _config:Config = new Config();

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
	public bounds(_?:Bounds):Bounds {
		return arguments.length ? (this._bounds = _!, this._bounds): this._bounds;
	}
	public svg(_?:d3.Selection<SVGSVGElement, any, SVGElement, any>):d3.Selection<SVGSVGElement, any, SVGElement, any> {
		return arguments.length ? (this._svg = _!, this._svg): this._svg;
	}
	protected outlineWrapEl(_?:d3.Selection<SVGGElement,any,SVGElement,any>):d3.Selection<SVGGElement,any,SVGElement,any> {
		return arguments.length ? (this._outlineWrapEl = _!, this._outlineWrapEl): this._outlineWrapEl;
	}
	public outlineEl(_?:d3.Selection<SVGGElement,any,SVGElement,any>):d3.Selection<SVGGElement,any,SVGElement,any> {
		return arguments.length ? (this._outlineEl = _!, this._outlineEl): this._outlineEl;
	}
	protected container(_?:HTMLElement):HTMLElement {
		return arguments.length ? (this._container = _!, this._container): this._container;
	}
	protected zoomBehavior(_?:d3.ZoomBehavior<Element,any>):d3.ZoomBehavior<SVGGElement,any> {
		return arguments.length ? (this._zoomBehavior = _!, this._zoomBehavior): this._zoomBehavior;
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
		const conf:Config = <Config>this.config();

		// size 재 계산
		if (conf.global.padding.left + conf.global.padding.right != 0) {
			bounds.width -= (conf.global.padding.left + conf.global.padding.right);
			bounds.height -= (conf.global.padding.top + conf.global.padding.bottom);
		}

		if(outlineWrapEl.size() > 0) {
			// 이전에 outline 이 있다면  삭제
			svg.selectAll("g.outline").remove();

		} else {
			// g.outlineWrap > g.outline 추가 
			//		- 그래프는 g.outline 에 추가됨
			//		- g.outlineWrapEl 는 zoom 영역임, svg 크기를 커버
			outlineWrapEl = svg.append("g").attr("class","outlineWrap");
			outlineWrapEl.append("rect").attr("class","background").attr("width",bounds.width).attr("height",bounds.height).attr("fill","transparent")
		}

		// g.outline 추가
		outlineEl = outlineWrapEl.append("g").attr("class","outline");
		if (conf.global.padding.top  != 0) svg.style("padding-top", conf.global.padding.top);
		if (conf.global.padding.bottom  != 0) svg.style("padding-bottom", conf.global.padding.bottom);
		if (conf.global.padding.left  != 0) svg.style("padding-left", conf.global.padding.left);
		if (conf.global.padding.right  != 0) svg.style("padding-right", conf.global.padding.right);


		// 멤버변수들
		this.outlineEl(outlineEl);
		this.svg(svg);
		this.container(container.node());
		this.outlineWrapEl(outlineWrapEl);

		// 데이터 모델 구성 후 그려주기
		this.populate(outlineEl, bounds, conf);

		// outline 수평/수직 정렬
		if(conf.global.align.horizontal=="center") UI.alignHorizontal(outlineEl.node()!);
		if(conf.global.align.vertical=="middle") UI.alignVertical(outlineEl.node()!);

		//bounds 재계산
		this.bounds(new Bounds(outlineEl));

		// Toolbar
		Toolbar.render(this);

		// ZOOM Behavior
		this.zoomBehavior(
			d3.zoom().on("zoom", (event)=> { outlineEl.attr("transform", event.transform); })
		);

		// ZOOM > 바인딩
		outlineWrapEl.call(this.zoomBehavior());
		outlineWrapEl.on("dblclick.zoom", null);	//zoom 더블클릭 이벤트 drop (because event bubbling)

		// Outline Transform > scale-ratio 옵션 반영
		if(conf.global.scale.ratio != 1) {
			this.zoom({k:conf.global.scale.ratio});
		} else {
			this.zoom();
		}

		return this;

	}


	/**
	 * ZOOM
	 */
	public zoom(z?:{x?:number,y?:number,k?:number}):GraphBase {

		let transform:d3.ZoomTransform = d3.zoomTransform(this.outlineEl().node()!);
		if (z) {
			// translate
			if(!z.x) z.x = transform.x;
			if(!z.y) z.y = transform.y;
			if(!z.k) z.k = transform.k;
		} else {
			// translate screen-fit
			const boundsEl:DOMRect = this.outlineEl().node()!.getBBox();
			const k:number = Math.min(boundsEl.width/this.bounds().width,boundsEl.height/this.bounds().height);
			z = {x:this.bounds().x, y:this.bounds().y, k:k};
		}
		this.outlineWrapEl().call(this.zoomBehavior().transform, d3.zoomIdentity.translate(z.x!, z.y!).scale(z.k!));

		return this;
	}

	/**
	 * ZOOM 계속 증감 처리
	 * 
	 * @param ratio 배율 (1보다 작으면 축소, 1보다 크면 확대)
	 */
	public zoomRatio(ratio:number,minRatio?:number, maxRatio?:number):GraphBase {

		
		let transform:d3.ZoomTransform = d3.zoomTransform(this.outlineEl().node()!);
		let k:number = transform.k*ratio;

		const conf:Config = <Config>this.config();
		if (!minRatio) minRatio = conf.global.scale.minRatio;
		if (!maxRatio) maxRatio = conf.global.scale.maxRatio;

		if(minRatio > 0 && k < minRatio)  k = minRatio;	//최소배율
		if(maxRatio > 0 && k > maxRatio)  k = maxRatio;	//최대배율

		this.zoom({x: transform.x, y:transform.y, k:k})

		return this;
	}


	/**
	 * 리사이즈 처리
	 * 
	 */
	public resize() {

		const bounds:Bounds = this.bounds() as Bounds;
		if(!bounds) return;
		let w:number = bounds.width;
		let h:number = bounds.height;
		let transform:Transform = Transform.instance(this.outlineEl().node()!);

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

		this.outlineWrapEl().call(this.zoomBehavior().transform, d3.zoomIdentity.translate(transform.x, transform.y).scale(transform.k==0?1:transform.k));
		this.bounds(<DOMRect>this._container.getBoundingClientRect());

	}
	
	protected abstract populate(outlineEl:d3.Selection<SVGGElement,any,SVGElement,any>, bounds:Bounds, conf:Config):void;

}
