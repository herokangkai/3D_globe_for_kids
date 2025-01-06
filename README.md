# 世界地图探索 (World Map Explorer)

一个交互式的3D世界地图探索应用，让用户可以通过丰富的可视化界面了解世界各国的基本信息、国旗和货币等文化特征。

## ✨ 特性

- 🌏 基于 Three.js 的交互式3D地球展示
- 🗺️ 支持旋转、缩放和平移的地图控制
- 🏳️ 展示各国国旗和基本信息
- 💰 展示各国货币信息
- 📱 响应式设计，支持各种设备

## 🛠️ 技术栈

- Three.js - 3D渲染引擎
- D3.js - 地理数据处理
- TopoJSON - 地理数据格式
- HTML5/CSS3 - 现代网页布局和动画

## 🚀 快速开始

1. 克隆仓库
```bash
git clone https://github.com/[your-username]/world-map-explorer.git
```

2. 打开项目目录
```bash
cd world-map-explorer
```

3. 启动本地服务器
由于浏览器的安全限制，需要通过HTTP服务器来运行项目。你可以使用以下任意方式：

使用 Python:
```bash
# Python 3.x
python -m http.server 8000
```

或者使用 Node.js 的 http-server:
```bash
npx http-server
```

4. 在浏览器中访问
```
http://localhost:8000
```

## 📂 项目结构

```
world-map-explorer/
├── index.html          # 主页面
├── main.js            # 主要JavaScript逻辑
├── styles.css         # 样式表
├── countries.json     # 国家数据
├── countryInfo.json   # 详细国家信息
└── images/           # 图片资源
    ├── flags/        # 国旗图片
    └── currency/     # 货币图片
```

## 🤝 贡献

欢迎提交 issues 和 pull requests！

## 📝 许可证

[MIT](LICENSE)

## 🙏 致谢

- [Three.js](https://threejs.org/)
- [D3.js](https://d3js.org/)
- [TopoJSON](https://github.com/topojson/topojson)
