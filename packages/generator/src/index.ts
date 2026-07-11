import JSZip from 'jszip'
import { serializeProject, validateProject, type ProjectSchema } from '@functorz/schema'
export const TEMPLATE_VERSION = '1.0.0'
export interface GeneratedProject {
  templateVersion: string
  files: ReadonlyMap<string, string>
}
function safeRoute(route: string) {
  if (!/^\/pages\/[a-z0-9][a-z0-9-]*$/.test(route) || route.includes('..'))
    throw new Error(`Unsafe page route: ${route}`)
  return `${route.slice(1)}/index`
}
const runtimeSource = `import { useEffect, useRef, useState } from 'react'
import { Button, Image, Input, Swiper, SwiperItem, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useDidShow } from '@tarojs/taro'
import project from './project.json'
type FlowNode={id:string;type:string;config:Record<string,unknown>}
type Flow={nodes:FlowNode[];edges:Array<{source?:string;target?:string;label?:string}>}
type Node={id:string;type:string;props:Record<string,unknown>;style?:Record<string,unknown>;events?:{tap?:Flow;load?:Flow;show?:Flow;scroll?:Flow};children:Node[]}
type Data=Record<string,unknown>
const size:Record<string,number>={none:0,xs:4,sm:8,md:16,lg:24,xl:36}
const font:Record<string,number>={xs:12,sm:14,md:16,lg:20,xl:28}
const radius:Record<string,number>={none:0,sm:4,md:10,lg:18,pill:999}
function style(node:Node){const s=node.style??{};return {color:s.color as string,backgroundColor:s.backgroundColor as string,fontSize:s.fontSize?font[String(s.fontSize)]:undefined,padding:s.spacing?size[String(s.spacing)]:undefined,borderRadius:s.radius?radius[String(s.radius)]:undefined,gap:s.gap?size[String(s.gap)]:undefined,gridTemplateColumns:s.columns?\`repeat(\${s.columns},minmax(0,1fr))\`:undefined}}
function get(value:unknown,path:string):unknown{return path.split('.').filter(Boolean).reduce<unknown>((current,key)=>current&&typeof current==='object'?(current as Data)[key]:undefined,value)}
function put(data:Data,path:string,value:unknown):Data{const keys=path.split('.').filter(Boolean);if(!keys.length||keys.some(key=>['__proto__','prototype','constructor'].includes(key)))throw new Error('Invalid data target');const next={...data};let cursor:Data=next;for(let index=0;index<keys.length;index++){const key=keys[index]!;if(index===keys.length-1){cursor[key]=value;break}cursor[key]={...((cursor[key]&&typeof cursor[key]==='object'?cursor[key]:{}) as Data)};cursor=cursor[key] as Data}return next}
function condition(expression:string,scope:Data){const match=expression.match(/^([\\w.$]+)\\s*==\\s*(.+)$/);if(!match)return Boolean(get(scope,expression));const left=get(scope,match[1]!);const raw=match[2]!.trim();const right=/^-?\\d+(\\.\\d+)?$/.test(raw)?Number(raw):raw.replace(/^['\"]|['\"]$/g,'');return left===right}
function apiUrl(url:string){if(!url.startsWith('/')||Taro.getEnv()!==Taro.ENV_TYPE.WEAPP)return url;const base=(globalThis as unknown as {process?:{env?:Record<string,string|undefined>}}).process?.env?.TARO_APP_API_BASE_URL;if(!base)throw new Error('TARO_APP_API_BASE_URL is required');return base.replace(/\\/$/,'')+url}
async function run(flow:Flow,data:Data,setData:(path:string,value:unknown)=>void){let current=flow.nodes.find(node=>node.type==='start');const scope={...data};for(let steps=0;current&&current.type!=='end'&&steps<100;steps++){const config=current.config??{};let result:boolean|undefined;if(current.type==='api'){try{const response=await Taro.request({url:apiUrl(String(config.url??'')),method:String(config.method??'GET') as 'GET'|'POST',timeout:10000});scope.response=response.data}catch(error){scope.response={code:-1,message:String(error)}}}else if(current.type==='condition')result=condition(String(config.expression??''),scope);else if(current.type==='setData'){const target=String(config.target??'');const value=get(scope,String(config.source??''));setData(target,value);Object.assign(scope,put(scope,target,value))}else if(current.type==='alert')await Taro.showToast({title:String(config.message??''),icon:'none'});const edges=flow.edges.filter(edge=>edge.source===current?.id&&edge.target);const edge=current.type==='condition'?edges.find(item=>result?['yes','true'].includes(String(item.label).toLowerCase()):['no','false'].includes(String(item.label).toLowerCase())):edges[0];current=edge?.target?flow.nodes.find(node=>node.id===edge.target):undefined}}
function items(node:Node,data:Data){const bound=get(data,String(node.props.dataSource??''));if(Array.isArray(bound))return bound as Data[];try{const fallback=JSON.parse(String(node.props.items??'[]'));return Array.isArray(fallback)?fallback:[]}catch{return []}}
function NodeView({node,data,runFlow}:{node:Node;data:Data;runFlow:(flow:Flow)=>Promise<void>}){const children=node.children.map(child=><NodeView node={child} data={data} runFlow={runFlow} key={child.id}/>);const click=node.events?.tap?()=>void runFlow(node.events!.tap!):undefined;const props={style:style(node),onClick:click,className:\`fz-\${node.type.toLowerCase()}\`};if(node.type==='Text')return <Text {...props}>{String(node.props.text??'')}</Text>;if(node.type==='Image')return <Image {...props} src={String(node.props.src??'')} mode="aspectFill"/>;if(node.type==='Button')return <Button {...props}>{String(node.props.text??'')}</Button>;if(node.type==='Input')return <Input {...props} name={String(node.props.name??'')} placeholder={String(node.props.placeholder??'')}/>;if(node.type==='Swiper')return <Swiper {...props} autoplay={Boolean(node.props.autoplay)}>{node.children.map(child=><SwiperItem key={child.id}><NodeView node={child} data={data} runFlow={runFlow}/></SwiperItem>)}</Swiper>;if(node.type==='Tabs'){const values=items(node,data).length?items(node,data).map(item=>String(item.label??item)):String(node.props.items??'').split(',');return <View {...props} style={{...props.style,display:'flex',justifyContent:'space-between'}}>{values.map((item,index)=><Text key={index} style={{color:index===Number(node.props.activeIndex??0)?'#ff5000':'#3a3038',fontWeight:index===Number(node.props.activeIndex??0)?'700':'400'}}>{item}</Text>)}</View>}if(node.type==='KingKongList')return <View {...props} style={{...props.style,display:'grid',gridTemplateColumns:\`repeat(\${Number(node.props.columns??5)},minmax(0,1fr))\`,gap:8}}>{items(node,data).map((item,index)=><View key={String(item.id??index)} style={{display:'flex',flexDirection:'column',alignItems:'center'}}><View style={{width:48,height:48,borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',backgroundColor:String(item.color??'#ff5000'),color:'#fff'}}>{String(item.icon??'')}</View><Text style={{fontSize:12}}>{String(item.label??'')}</Text></View>)}</View>;if(node.type==='ProductList')return <View {...props} style={{...props.style,display:'grid',gridTemplateColumns:\`repeat(\${Number(node.props.columns??2)},minmax(0,1fr))\`,gap:8}}>{items(node,data).map((item,index)=><View key={String(item.id??index)} style={{overflow:'hidden',borderRadius:10,backgroundColor:'#fff'}}><Image src={String(item.image??'')} mode="aspectFill" style={{width:'100%',aspectRatio:'1/1'}}/><View style={{padding:10}}><Text>{String(item.name??'')}</Text><Text style={{display:'block',color:'#ff5000',fontWeight:'700'}}>\u00a5{String(item.price??'')}</Text></View></View>)}</View>;return <View {...props}>{children}</View>}
export function GeneratedPage({pageId}:{pageId:string}){const page=project.pages.find(p=>p.id===pageId)??project.pages[0];const [data,setData]=useState<Data>({});const ref=useRef(data);ref.current=data;const runFlow=(flow:Flow)=>run(flow,ref.current,(path,value)=>setData(current=>{const next=put(current,path,value);ref.current=next;return next}));useEffect(()=>{if(page.root.events?.load)void runFlow(page.root.events.load)},[page.id]);useDidShow(()=>{if(page.root.events?.show)void runFlow(page.root.events.show)});return <NodeView node={page.root as Node} data={data} runFlow={runFlow}/>}
`
export function generateProject(input: ProjectSchema): GeneratedProject {
  const project = validateProject(input)
  const pages = project.pages.map((p) => safeRoute(p.route))
  const files = new Map<string, string>()
  files.set(
    'package.json',
    JSON.stringify(
      {
        name: 'functorz-export',
        version: '1.0.0',
        private: true,
        scripts: { 'build:h5': 'taro build --type h5', 'build:weapp': 'taro build --type weapp' },
        dependencies: {
          '@babel/runtime': '7.29.7',
          '@tarojs/components': '4.2.0',
          '@tarojs/helper': '4.2.0',
          '@tarojs/react': '4.2.0',
          '@tarojs/runtime': '4.2.0',
          '@tarojs/taro': '4.2.0',
          react: '18.3.1',
          'react-dom': '18.3.1',
        },
        devDependencies: {
          '@tarojs/cli': '4.2.0',
          '@tarojs/plugin-framework-react': '4.2.0',
          '@tarojs/plugin-platform-h5': '4.2.0',
          '@tarojs/plugin-platform-weapp': '4.2.0',
          '@tarojs/taro-loader': '4.2.0',
          '@tarojs/webpack5-runner': '4.2.0',
          'babel-preset-taro': '4.2.0',
          less: '4.5.1',
          postcss: '8.5.15',
          webpack: '5.91.0',
          typescript: '5.9.3',
        },
      },
      null,
      2,
    ),
  )
  files.set('src/project.json', serializeProject(project))
  files.set('src/runtime.tsx', runtimeSource)
  files.set('src/app.config.ts', `export default defineAppConfig(${JSON.stringify({ pages })})\n`)
  files.set(
    'src/app.tsx',
    `import type { PropsWithChildren } from 'react'\nimport './app.css'\nexport default function App({children}:PropsWithChildren){return children}\n`,
  )
  files.set(
    'src/app.css',
    `.fz-page{min-height:100vh}.fz-section,.fz-card,.fz-form,.fz-flex,.fz-grid{display:flex;flex-direction:column}.fz-image{width:100%}.fz-grid{display:grid}`,
  )
  project.pages.forEach((page) => {
    const route = safeRoute(page.route)
    files.set(
      `src/${route}.tsx`,
      `import {GeneratedPage} from '../../runtime'\nexport default function Page(){return <GeneratedPage pageId="${page.id}"/>}\n`,
    )
    files.set(
      `src/${route}.config.ts`,
      `export default definePageConfig(${JSON.stringify({ navigationBarTitleText: page.name })})\n`,
    )
  })
  files.set('babel.config.js', `module.exports={presets:[['taro',{framework:'react',ts:true}]]}\n`)
  files.set(
    'tsconfig.json',
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          jsx: 'react-jsx',
          resolveJsonModule: true,
          esModuleInterop: true,
          skipLibCheck: true,
        },
        include: ['src', 'config'],
      },
      null,
      2,
    ),
  )
  files.set(
    'config/index.ts',
    `import {defineConfig} from '@tarojs/cli'\nexport default defineConfig({projectName:'functorz-export',date:'2026-06-29',designWidth:750,deviceRatio:{640:1.17,750:1,375:2,828:0.905},sourceRoot:'src',outputRoot:'dist',framework:'react',compiler:'webpack5',h5:{publicPath:'/',staticDirectory:'static'},mini:{},cache:{enable:false}})\n`,
  )
  files.set('config/dev.ts', `export default {}\n`)
  files.set('config/prod.ts', `export default {}\n`)
  files.set(
    'src/index.html',
    '<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Functorz Export</title></head><body><div id="app"></div></body></html>',
  )
  files.set(
    'project.config.json',
    JSON.stringify(
      {
        miniprogramRoot: 'dist/',
        projectname: project.name,
        appid: 'touristappid',
        compileType: 'miniprogram',
      },
      null,
      2,
    ),
  )
  files.set(
    'README.md',
    `# ${project.name}\n\nGenerated by Functorz template ${TEMPLATE_VERSION}.\n\n\`pnpm build:h5\` / \`pnpm build:weapp\`\n\nFor WeChat builds, set \`TARO_APP_API_BASE_URL=https://your-api-domain.example\`. The HTTPS domain must be added to the Mini Program request-domain allowlist.\n`,
  )
  return { templateVersion: TEMPLATE_VERSION, files }
}
export async function generateZip(project: ProjectSchema): Promise<Uint8Array> {
  const generated = generateProject(project)
  const zip = new JSZip()
  ;[...generated.files.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([path, content]) => zip.file(path, content, { date: new Date(0) }))
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', platform: 'UNIX' })
}
