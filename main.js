// 创建场景、相机和渲染器
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('map-container').appendChild(renderer.domElement);

// 设置相机位置
camera.position.z = 200;

// 添加轨道控制
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// 创建球形地图投影
const projection = d3.geoOrthographic()
    .scale(100)
    .translate([0, 0])
    .clipAngle(90);

// 加载纹理
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg');
const bumpTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg');
const specTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg');
const cloudTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png');

// 添加全局旋转控制变量
let isRotating = true;
let autoRotateSpeed = 0.0005;
let earthGroup, clouds; // 添加全局变量以存储对象引用

// 加载世界地图数据
let countries; // 添加全局变量
d3.json('https://unpkg.com/world-atlas@2/countries-110m.json').then(function(data) {
    countries = topojson.feature(data, data.objects.countries);
    
    // 创建地球基础球体
    const sphereGeometry = new THREE.SphereGeometry(100, 64, 64);
    const sphereMaterial = new THREE.MeshPhongMaterial({
        map: earthTexture,
        bumpMap: bumpTexture,
        bumpScale: 0.8,
        specularMap: specTexture,
        specular: new THREE.Color('grey'),
        shininess: 5
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    
    // 创建一个组来包含所有内容
    earthGroup = new THREE.Group();
    
    // 创建一个组来包含所有边界线
    const boundariesGroup = new THREE.Group();
    
    // 创建国家边界和区域
    countries.features.forEach(function(country) {
        // 创建边界线
        const lineGeometry = new THREE.BufferGeometry();
        const lineCoordinates = [];
        
        // 创建区域网格
        const shapeGeometry = new THREE.BufferGeometry();
        const shapeCoordinates = [];
        
        // 处理多边形坐标
        const processCoordinates = (coords) => {
            coords.forEach(ring => {
                const points = [];
                for (let i = 0; i < ring.length; i++) {
                    const point = ring[i];
                    const lat = point[1] * Math.PI / 180;
                    const lon = -point[0] * Math.PI / 180;
                    const radius = 100;
                    
                    const x = radius * Math.cos(lat) * Math.cos(lon);
                    const y = radius * Math.sin(lat);
                    const z = radius * Math.cos(lat) * Math.sin(lon);
                    
                    points.push(new THREE.Vector3(x, y, z));
                    
                    // 添加到边界线坐标
                    if (i > 0) {
                        lineCoordinates.push(points[i-1].x, points[i-1].y, points[i-1].z);
                        lineCoordinates.push(x, y, z);
                    }
                }
                
                // 添加到区域坐标
                for (let i = 1; i < points.length - 1; i++) {
                    shapeCoordinates.push(points[0].x, points[0].y, points[0].z);
                    shapeCoordinates.push(points[i].x, points[i].y, points[i].z);
                    shapeCoordinates.push(points[i+1].x, points[i+1].y, points[i+1].z);
                }
            });
        };

        if (country.geometry.type === 'Polygon') {
            processCoordinates(country.geometry.coordinates);
        } else if (country.geometry.type === 'MultiPolygon') {
            country.geometry.coordinates.forEach(polygon => {
                processCoordinates(polygon);
            });
        }

        // 创建边界线
        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lineCoordinates, 3));
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xFFFFFF,
            linewidth: 1,
            transparent: true,
            opacity: 0.5
        });
        const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
        
        // 创建区域网格
        shapeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(shapeCoordinates, 3));
        shapeGeometry.computeVertexNormals(); // 计算法线以便正确显示光照
        const shapeMaterial = new THREE.MeshPhongMaterial({
            color: 0x808080,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const shape = new THREE.Mesh(shapeGeometry, shapeMaterial);
        
        // 修改存储国家ID的方式
        let countryId = country.id || country.properties.ISO_A3;
        
        // 如果是台湾，将其ID改为中国的ID
        if (countryId === '158' || countryId === 'TWN') {
            countryId = '156'; // 使用中国的数字代码
        }
        
        // 存储国家ID和名称
        lines.userData.countryId = countryId;
        lines.userData.countryName = country.properties.name;
        shape.userData.countryId = countryId;
        shape.userData.countryName = country.properties.name;
        
        // 将边界线和区域添加到边界组中
        boundariesGroup.add(lines);
        boundariesGroup.add(shape);
    });
    
    // 将地球和边界组添加到主组中
    earthGroup.add(sphere);
    earthGroup.add(boundariesGroup);
    
    // 将地球组添加到场景
    scene.add(earthGroup);

    // 创建云层
    const cloudGeometry = new THREE.SphereGeometry(101, 64, 64);
    const cloudMaterial = new THREE.MeshPhongMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.4
    });
    clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    scene.add(clouds);

    // 创建气层效果
    const atmosphereGeometry = new THREE.SphereGeometry(102, 64, 64);
    const atmosphereMaterial = new THREE.MeshPhongMaterial({
        color: 0x4B6B8C,
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    // 修改动画函数
    function animate() {
        requestAnimationFrame(animate);
        if (isRotating) {
            earthGroup.rotation.y += autoRotateSpeed;
            clouds.rotation.y += autoRotateSpeed + 0.0002;
        }
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
});

// 调整光源位置和强度
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 1.4);
pointLight.position.set(200, 200, 200);
scene.add(pointLight);

// 添加射线投射器用于检测点击
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// 处理点击事件
function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // 检测所有对象，包括地球表面和国内区域
    const intersects = raycaster.intersectObjects(earthGroup.children[1].children, true);
    
    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        const countryId = clickedObject.userData.countryId;
        
        if (countryId) {
            console.log('Clicked country:', countryId); // 添加调试信息
            isRotating = false;
            showCountryInfo(countryId);
        }
    }
}

// 将 countryInfo.json 的内容直接放在 JavaScript 文件中
const countryData = {
    "USA": {
        "name": "美国",
        "flag": {
            "name": "星条旗",
            "image": "https://flagcdn.com/w640/us.png",
            "description": "美国国旗，红白条纹和蓝底白星"
        },
        "capital": "华盛顿特区",
        "population": "3.31亿",
        "area": "937万平方公里",
        "famousAnimal": {
            "name": "白头鹰",
            "image": "data:image/jpeg;base64,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",
            "description": "白头鹰是美国的国鸟，象征自由和力量"
        },
        "currency": {
            "name": "美元",
            "code": "USD",
            "symbol": "$",
            "image": "images/currency/usd.jpeg",
            "description": "美元是美国的法定货币，也是世界主要储备货币"
        }
    },
    "CHN": {
        "name": "中国",
        "flag": {
            "name": "五星红旗",
            "image": "https://flagcdn.com/w640/cn.png",
            "description": "中华人民共和国国旗，红底上有一颗大五角星和四颗小五角星"
        },
        "capital": "北京",
        "population": "14亿",
        "area": "963万平方公里",
        "famousAnimal": {
            "name": "大熊猫",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Grosser_Panda.JPG/1280px-Grosser_Panda.JPG",
            "description": "大熊猫是中国的国宝，世界珍稀动物"
        },
        "currency": {
            "name": "人民币",
            "code": "CNY",
            "symbol": "¥",
            "image": "images/currency/rmb.jpeg",
            "description": "人民币是中华人民共和国的法定货币"
        }
    },
    "BRA": {
        "name": "巴西",
        "flag": {
            "name": "巴西国旗",
            "image": "https://flagcdn.com/w640/br.png",
            "description": "巴西国旗，绿底上有黄色菱形和蓝色圆圈"
        },
        "capital": "巴西利亚",
        "population": "2.12亿",
        "area": "851万平方公里",
        "famousAnimal": {
            "name": "美洲豹",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Standing_jaguar.jpg/1280px-Standing_jaguar.jpg",
            "description": "美洲豹是巴西的标志性动物，象征着力量和敏捷"
        },
        "currency": {
            "name": "巴西雷亚尔",
            "code": "BRL",
            "symbol": "R$",
            "image": "images/currency/巴西雷亚尔.webp",
            "description": "巴西雷亚尔是巴西的法定货币"
        }
    },
    "MEX": {
        "name": "墨西哥",
        "flag": {
            "name": "墨西哥国旗",
            "image": "https://flagcdn.com/w640/mx.png",
            "description": "墨西哥国旗，绿白红三色竖条，中央有国徽"
        },
        "capital": "墨西哥城",
        "population": "1.29亿",
        "area": "196万平方公里",
        "famousAnimal": {
            "name": "金鹰",
            "image": "https://www.2008php.com/2017_Website_appreciate/2017-05-19/20170519093623CLDMkCLDMk.jpg",
            "description": "金鹰是墨西哥的国鸟，出现在国徽上"
        },
        "currency": {
            "name": "墨西哥比索",
            "code": "MXN",
            "symbol": "$",
            "image": "images/currency/墨西哥比索.webp",
            "description": "墨西哥比索是墨西哥的法定货币"
        }
    },
    "RUS": {
        "name": "俄罗斯",
        "flag": {
            "name": "俄罗斯国旗",
            "image": "https://flagcdn.com/w640/ru.png",
            "description": "俄罗斯国旗，白蓝红三色横条"
        },
        "capital": "莫斯科",
        "population": "1.44亿",
        "area": "1710万平方公里",
        "famousAnimal": {
            "name": "棕熊",
            "image": "https://ts1.cn.mm.bing.net/th/id/R-C.4c1220f44b52f1a7d7ab2ba278a724ff?rik=Lv%2bIULeuAuvXOg&riu=http%3a%2f%2fpic.baike.soso.com%2fp%2f20140428%2f20140428100815-1459339415.jpg&ehk=1HtcG6jirmp%2byONw1ADxO0njIJqn%2fJ951TrYUQ8r4jE%3d&risl=&pid=ImgRaw&r=0",
            "description": "棕熊是俄罗斯的标志性动物，象征着力量和勇气"
        },
        "currency": {
            "name": "俄罗斯卢布",
            "code": "RUB",
            "symbol": "₽",
            "image": "images/currency/俄罗斯卢布.webp",
            "description": "俄罗斯卢布是俄罗斯的法定货币"
        }
    },
    "GBR": {
        "name": "英国",
        "flag": {
            "name": "米字旗",
            "image": "https://flagcdn.com/w640/gb.png",
            "description": "英国国旗，蓝底上有红白十字"
        },
        "capital": "伦敦",
        "population": "6700万",
        "area": "24.4万平方公里",
        "famousAnimal": {
            "name": "雄狮",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Lion_waiting_in_Namibia.jpg/1280px-Lion_waiting_in_Namibia.jpg",
            "description": "雄狮是英国的国徽动物，象征王权和勇气"
        },
        "currency": {
            "name": "英镑",
            "code": "GBP",
            "symbol": "£",
            "image": "images/currency/英镑.webp",
            "description": "英镑是英国的法定货币"
        }
    },
    "FRA": {
        "name": "法国",
        "flag": {
            "name": "三色旗",
            "image": "https://flagcdn.com/w640/fr.png",
            "description": "法国国旗，蓝白红三色竖条"
        },
        "capital": "巴黎",
        "population": "6700万",
        "area": "54.7万平方公里",
        "famousAnimal": {
            "name": "高卢雄鸡",
            "image": "https://tse1-mm.cn.bing.net/th/id/OIP-C.yeqRJUjk2g0H4g_ZMBHuMwHaHb?rs=1&pid=ImgDetMain",
            "description": "高卢雄鸡是法国的非官方国鸟，象征着骄傲和勇气"
        },
        "currency": {
            "name": "欧元",
            "code": "EUR",
            "symbol": "€",
            "image": "images/currency/欧元.webp",
            "description": "欧元是法国和欧盟多数成员国的官方货币"
        }
    },
    "DEU": {
        "name": "德国",
        "flag": {
            "name": "德国国旗",
            "image": "https://flagcdn.com/w640/de.png",
            "description": "德国国旗，黑红金三色横条"
        },
        "capital": "柏林",
        "population": "8300万",
        "area": "35.7万平方公里",
        "famousAnimal": {
            "name": "黑鹰",
            "image": "https://pic.ntimg.cn/file/20230326/2234013_215645501107_2.jpg",
            "description": "黑鹰是德国的国徽动物，象征力量和统一"
        },
        "currency": {
            "name": "欧元",
            "code": "EUR",
            "symbol": "€",
            "image": "images/currency/欧元.webp",
            "description": "欧元是德国和欧盟多数成员国的官方货币"
        }
    },
    "JPN": {
        "name": "日本",
        "flag": {
            "name": "日章旗",
            "image": "https://flagcdn.com/w640/jp.png",
            "description": "日本国旗，白底红日"
        },
        "capital": "东京",
        "population": "1.26亿",
        "area": "37.8万平方公里",
        "famousAnimal": {
            "name": "日本猕猴",
            "image": "https://bpic.588ku.com/back_origin_min_pic/22/08/05/bc447fc5f02bf19c2aab8a30c6ed0b05.jpg",
            "description": "日本猕猴是日本特有物种，也被称为雪猴"
        },
        "currency": {
            "name": "日元",
            "code": "JPY",
            "symbol": "¥",
            "image": "images/currency/日元.webp",
            "description": "日元是日本的法定货币"
        }
    },
    "IND": {
        "name": "印度",
        "flag": {
            "name": "三色旗",
            "image": "https://flagcdn.com/w640/in.png",
            "description": "印度国旗，橙白绿三色横条，中央有蓝色法轮"
        },
        "capital": "新德里",
        "population": "13.8亿",
        "area": "297万平方公里",
        "famousAnimal": {
            "name": "孟加拉虎",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Walking_tiger_female.jpg/1280px-Walking_tiger_female.jpg",
            "description": "孟加拉虎是印度的国兽，象征着力量和威严"
        },
        "currency": {
            "name": "印度卢比",
            "code": "INR",
            "symbol": "₹",
            "image": "images/currency/印度卢比.webp",
            "description": "印度卢比是印度的法定货币"
        }
    }
    // ... 可以继续添加更多国家
};

// 添加国家代码映射
const countryCodeMap = {
    '004': 'AFG', // Afghanistan
    '008': 'ALB', // Albania
    '012': 'DZA', // Algeria
    '024': 'AGO', // Angola
    '032': 'ARG', // Argentina
    '036': 'AUS', // Australia
    '040': 'AUT', // Austria
    '050': 'BGD', // Bangladesh
    '056': 'BEL', // Belgium
    '076': 'BRA', // Brazil
    '124': 'CAN', // Canada
    '156': 'CHN', // China
    '250': 'FRA', // France
    '276': 'DEU', // Germany
    '356': 'IND', // India
    '392': 'JPN', // Japan
    '410': 'KOR', // South Korea
    '484': 'MEX', // Mexico
    '528': 'NLD', // Netherlands
    '643': 'RUS', // Russia
    '724': 'ESP', // Spain
    '752': 'SWE', // Sweden
    '756': 'CHE', // Switzerland
    '826': 'GBR', // United Kingdom
    '840': 'USA', // United States
    // ... 可以根据需要添加更多映射
};

// 修改 showCountryInfo 函数
function showCountryInfo(countryId) {
    console.log('Showing info for country:', countryId);
    
    // 将数字代码转换为三字母代码
    const alpha3Code = countryCodeMap[countryId];
    console.log('Converted to alpha3 code:', alpha3Code);
    
    // 重置��有区域和边界线的颜色
    earthGroup.children[1].children.forEach(child => {
        if (child instanceof THREE.LineSegments) {
            child.material.color.setHex(0xFFFFFF);
            child.material.opacity = 0.5;
        } else if (child instanceof THREE.Mesh) {
            child.material.color.setHex(0x808080);
            child.material.opacity = 0.1;
        }
    });
    
    // 高亮选中的国家
    earthGroup.children[1].children.forEach(child => {
        if (child.userData.countryId === countryId) {
            if (child instanceof THREE.LineSegments) {
                child.material.color.setHex(0xFFFF00);
                child.material.opacity = 1;
            } else if (child instanceof THREE.Mesh) {
                child.material.color.setHex(0xFFFF00);
                child.material.opacity = 0.3;
            }
        }
    });

    // 使用转换后的代码获取国家数据
    const data = countryData[alpha3Code];
    if (data) {
        try {
            // 更新信息面板内容
            document.getElementById('country-name').textContent = data.name || 'Unknown';
            document.getElementById('capital').textContent = data.capital || 'Unknown';
            document.getElementById('population').textContent = data.population || 'Unknown';
            document.getElementById('area').textContent = data.area || 'Unknown';
            
            // 更新图片
            const flagImg = document.querySelector('.flag');
            flagImg.onerror = () => console.error('Error loading flag image');
            flagImg.src = data.flag.image;
            
            const currencyImg = document.querySelector('.currency-image');
            currencyImg.onerror = () => console.error('Error loading currency image');
            currencyImg.src = data.currency.image;
            
            const animalImg = document.querySelector('.animal-image');
            animalImg.onerror = () => console.error('Error loading animal image');
            animalImg.src = data.famousAnimal.image;
            
            // 更新描述
            document.querySelector('.currency-description').textContent = 
                data.currency.description || 'No description available';
            document.querySelector('.animal-description').textContent = 
                data.famousAnimal.description || 'No description available';
            
            // 显示信息面板
            const infoPanel = document.getElementById('info-panel');
            infoPanel.style.display = 'block';
            
        } catch (error) {
            console.error('Error updating DOM:', error);
        }
    } else {
        console.log('No data found for country:', alpha3Code);
    }
}

// 添加事件监听器
renderer.domElement.addEventListener('click', onMouseClick);

// 添加关闭按钮事件，重置高亮效果
document.getElementById('close-button').addEventListener('click', function() {
    // 重置所有区域和边界线的颜色
    earthGroup.children[1].children.forEach(child => {
        if (child instanceof THREE.LineSegments) {
            child.material.color.setHex(0xFFFFFF);
            child.material.opacity = 0.5;
        } else if (child instanceof THREE.Mesh) {
            child.material.color.setHex(0x808080);
            child.material.opacity = 0.1;
        }
    });
    
    document.getElementById('info-panel').style.display = 'none';
    isRotating = true;
});

// 添加鼠标移出信息面板事件
document.getElementById('info-panel').addEventListener('mouseleave', function() {
    isRotating = true;
});

// 处理窗口大小变化
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
