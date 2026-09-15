# 暗房 Darkroom

**VISUAL RESEARCH DATABASE** — “策展超市 2.0” 中的「暗房」主题项目

线上地址：https://b3-darkroom.pages.dev （GitHub Pages：https://caascd-curation.github.io/B3-Darkroom/ ）

## 项目简介

「暗房」是“策展超市 2.0”策展框架下的一个主题研究项目。暗房是摄影术诞生以来图像被“显影”的隐秘场所——本网站把“暗房”当作一种观察方法，建立一个围绕它的视觉研究数据库：凡是涉及成像、加工、保存、隐藏、隔绝的图像与文本，都被收集、分类、钉在这面黑红色的“墙”上，等待显影。

## 项目内容

网站是一个围绕“暗房”建立的视觉数据库，共 178 条词条，通过两个维度组织内容：

- **MEDIA｜媒介**：PAINTING 绘画 / PHOTOGRAPHY 摄影 / INSTALLATION 装置 / LITERATURE 文学 / MOVING IMAGE 影像 / SPACE 空间 / SOCIAL PHENOMENON 社会现象 / TECHNOLOGY 科技 / INTERNET 网络
- **DARKROOM AS｜暗房功能**：IMAGE 成像 / PROCESS 加工 / STORAGE 保存 / HIDDEN 隐藏 / ISOLATION 隔绝

数据库包含 A / B / C / D 四个内容分类：

- **A｜经典艺术档案 Classic Art Archives** — 艺术史中的经典作品与档案图像
- **B｜文学意象 Literary Imagery** — 文学作品中的暗房式意象与场景
- **C｜社会素材 Social Materials** — 当代社会现象与互联网文化中的“暗房”
- **D｜形式灵感 Formal References** — 形式、材料与感官层面的参考

每条词条包含：ID、词条名称、图片、出处、年代、媒介（MEDIA）、暗房功能（DARKROOM AS）、标签、备注说明。

## 核心交互

- 黑红色暗房环境：整站处于红色安全灯氛围下
- 照片墙式自由排布：词条以冲印照片的形式不规则地钉在墙面上
- 图片默认呈黑红双色（duotone）效果，如同暗房中未显影的相纸
- 点击图片后进入详情，图像逐渐“显影”为原始彩色图像
- 详情页可查看词条、出处、年代、标签（含 MEDIA / DARKROOM AS）、备注等信息
- 支持 MEDIA 与 DARKROOM AS 双重分类筛选，计数实时交叉联动
- 从详情页点击底部 BACK 返回照片墙，筛选状态保持不变

## 项目结构

```text
├── index.html          # 页面结构（筛选栏、照片墙、详情态）
├── styles/
│   └── main.css        # 全部样式：暗房环境、照片墙、显影转场、响应式
├── js/
│   ├── app.js          # 命名空间 / 全局筛选状态 / 初始化
│   ├── filterbar.js    # 顶部 MEDIA 一级筛选
│   ├── sidebar.js      # 左侧 DARKROOM AS 二级筛选
│   ├── imagewall.js    # 照片墙渲染与不规则排布
│   └── detail.js       # 详情态：点击显影（黑红 → 原彩）
├── data/
│   └── database.js     # 数据库（178 条词条 + 分类配置），由 Excel 生成
├── images/             # 图片资源，按词条 ID 命名，分四类存放
│   ├── A/              # A 类｜经典艺术档案（A-01 ~ A-50）
│   ├── B/              # B 类｜文学意象（B-01 ~ B-50）
│   ├── C/              # C 类｜社会素材（C-01 ~ C-50）
│   └── D/              # D 类｜形式灵感（D-01 ~ D-50）
└── materials/          # 材料文件（预留，按 ID 命名，如 B-23.pdf）
```

**ID 是数据、图片、材料三者之间唯一的对应关系**：词条 `C-35` 的图片即 `images/C/C-35.jpg`，多张副图以 `C-35-01.jpg`、`C-35-02.jpg` 命名。

## 技术

- 纯静态站点：原生 HTML / CSS / JavaScript，无任何框架与构建步骤
- 数据与代码分离：全部词条内容在 `data/database.js`，网页代码不硬编码数据
- 数据库由本地 Python 脚本从 Excel（暗房0912.xlsx）自动生成（openpyxl 读取词条、Pillow 读取图片尺寸）
- 部署：Cloudflare Pages（主）/ GitHub Pages（本仓库自动同步）

## 使用说明

### 本地运行

这是一个纯静态网站，任意静态文件服务器即可运行：

```bash
# 方式一：项目自带零依赖 Node 静态服务器（Kimi Work 预览也走这条）
npm run dev            # 默认 http://127.0.0.1:7100
npm run dev -- --port 8000 --host 127.0.0.1

# 方式二：任意其他静态服务器（二选一）
python -m http.server 8000
npx serve .
```

然后浏览器打开对应地址即可。

注意：直接双击 `index.html`（file:// 协议）也可以浏览，但建议用本地服务器以获得一致的加载行为。

### 更新数据库 / 图片

1. **改内容**：编辑 Excel 数据库后，重新运行本地构建脚本重新生成 `data/database.js`（网页代码无需改动）
2. **换图片**：把新图片按 ID 命名后放入 `images/A|B|C|D/` 对应文件夹，重新运行构建脚本更新尺寸数据
3. **缺图检查**：构建脚本会输出「缺图词条」与「无词条图片」清单，按清单补齐即可，不要手动改 `database.js`
