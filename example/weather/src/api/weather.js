import defaultOptions from '../../config.json';

/**
 * @type {vcs.vcm.plugins.weather.Weather}
 */
let _instance = null;

const framework = vcs.vcm.Framework.getInstance();

/** @type {Cesium.Cartesian3} */
let gravityScratch = new Cesium.Cartesian3();
/** @type {Cesium.Matrix4} */
let modelMatrix = new Cesium.Matrix4();

/**
 * Weather class using Cesium Particle Systems
 * @class
 * @memberOf vcs.vcm.plugins.weather
 */
export default class Weather {
  constructor(options) {
    /** @type {real} */
    this.radius = options.radius || 100000.0;
    /** @type {Cesium.Cartesian3} */
    this.position = null;
    /** @type {Cesium.Scene || null} */
    this.scene = null;
    /** @type {Cesium.Clock || null} */
    this.clock = null;
    /** @type {Cesium.AnimationViewModel || null} */
    this.animationViewModel = null;
    /** @type {Cesium.ParticleSystem || null} */
    this.snowSystem = null;
    /** @type {Cesium.ParticleSystem || null} */
    this.rainSystem = null;
    /** @type {number} */
    this.cloudHeight = options.cloudHeight || 2000;
    
    /**
     * update callback function: defines how the particles will be updated
     * creates downward movement and sets alpha 0 at specific distance
     * @param {Cesium.Particle} particle
     * @param {number} dt
     */
    this.snowUpdateFunction = (particle) => {
      Cesium.Cartesian3.normalize(particle.position, gravityScratch);
      Cesium.Cartesian3.multiplyByScalar(gravityScratch, Cesium.Math.randomBetween(-30.0, -300.0), gravityScratch);
      particle.velocity = Cesium.Cartesian3.add(particle.velocity, gravityScratch, particle.velocity);
      
      const distance = Cesium.Cartesian3.distance(this.scene.camera.position, particle.position);
      if (distance > this.radius) {
        particle.endColor.alpha = 0.0;
      } else { particle.endColor.alpha = this.snowSystem.endColor.alpha / (distance / this.radius + 0.1); }
    };
    this.rainUpdateFunction = (particle) => {
      Cesium.Cartesian3.normalize(particle.position, gravityScratch);
      Cesium.Cartesian3.multiplyByScalar(gravityScratch, -750.0, gravityScratch);
      particle.velocity = Cesium.Cartesian3.add(particle.velocity, gravityScratch, particle.velocity);
      
      const distance = Cesium.Cartesian3.distance(this.scene.camera.position, particle.position);
      if (distance > this.radius) {
        particle.endColor.alpha = 0.0;
      } else { particle.endColor.alpha = 0.7 / (distance / this.radius + 0.1); }
    };
  }
  
  /**
   * Singleton
   * @param {Object} [options] - plugin config
   * @return {vcs.vcm.plugins.weather.Weather} instance of Weather
   */
  static getInstance(options) {
    if (_instance) {
      return _instance;
    }
    // add user information
    _instance = new Weather(Object.assign(defaultOptions, options));
    _instance.initialize();
    return _instance;
  }
  
  initialize() {
    const activeMap = framework.getActiveMap();
  
    if (activeMap instanceof vcs.vcm.maps.Cesium) {
      this.scene = activeMap.getScene();
      this.clock = activeMap.getCesiumWidget().clock;
      const clockViewModel = new Cesium.ClockViewModel(this.clock);
      this.animationViewModel = new Cesium.AnimationViewModel(clockViewModel);
    
      this.scene.globe.depthTestAgainstTerrain = true;
    
      // set position of model matrix
      this.staticHeight(this.scene.camera.position, this.cloudHeight);
      modelMatrix = new Cesium.Matrix4.fromTranslation(this.position);
    
      // snowSystem properties
      const snowParticleSize = this.scene.drawingBufferWidth / 100;
    
      this.snowSystem = new Cesium.ParticleSystem({
        show: false,
        modelMatrix,
        minimumSpeed: -1.0,
        maximumSpeed: 0.0,
        lifetime: 15.0,
        emitter: new Cesium.SphereEmitter(this.radius),
        startScale: 0.5,
        endScale: 1.0,
        image: 'assets/snowflake_particle.png',
        startColor: Cesium.Color.WHITE.withAlpha(0.0),
        endColor: Cesium.Color.WHITE.withAlpha(1.0),
        minimumImageSize: new Cesium.Cartesian2(snowParticleSize, snowParticleSize),
        maximumImageSize: new Cesium.Cartesian2(snowParticleSize * 2.0, snowParticleSize * 2.0),
        updateCallback: this.snowUpdateFunction.bind(this),
      });
      this.scene.primitives.add(this.snowSystem);
    
      // rainSystem properties
    
      const rainParticleSize = this.scene.drawingBufferWidth / 80.0;
    
      this.rainSystem = new Cesium.ParticleSystem({
        show: false,
        modelMatrix,
        speed: -1.0,
        lifetime: 15.0,
        emitter: new Cesium.SphereEmitter(this.radius),
        startScale: 1.0,
        endScale: 0.0,
        image: 'assets/circular_particle.png',
        startColor: new Cesium.Color(0.27, 0.5, 0.70, 0.0),
        endColor: new Cesium.Color(0.27, 0.5, 0.70, 0.98),
        imageSize: new Cesium.Cartesian2(rainParticleSize, rainParticleSize * 2.0),
        updateCallback: this.rainUpdateFunction.bind(this),
      });
      this.scene.primitives.add(this.rainSystem);
    }
  }
  
  /**
   * Calculates position of emission source from camera position and the cloud height property
   * @param {Cesium.Cartesian3} cameraPosition
   * @param {number} height
   */
  staticHeight(cameraPosition, height) {
    const positionLatLng = Cesium.Ellipsoid.WGS84.cartesianToCartographic(cameraPosition);
    this.position = new Cesium.Cartesian3.fromDegrees(
      Cesium.Math.toDegrees(positionLatLng.longitude),
      Cesium.Math.toDegrees(positionLatLng.latitude),
      height,
    );
  }
  
  /**
   * initiates the precipitation depending on the chosen weatherSystem
   * @param {string} system
   * @param {number} intensity
   */
  start(system, intensity) {
    if (!(framework.getActiveMap() instanceof vcs.vcm.maps.Cesium)) {
      return;
    }
    if (system === 'rain') {
      this.rainSystem.show = true;
      this.snowSystem.show = false;
      
      this.rainSystem.emissionRate = intensity;
      
      this.scene.skyAtmosphere.hueShift = -0.97;
      this.scene.skyAtmosphere.saturationShift = 0.25;
      this.scene.skyAtmosphere.brightnessShift = -0.4;
      
      this.scene.fog.density = 0.00025;
      this.scene.fog.minimumBrightness = 0.01;
    } else if (system === 'snow') {
      this.rainSystem.show = false;
      this.snowSystem.show = true;
      
      this.snowSystem.emissionRate = intensity;
      
      this.scene.skyAtmosphere.hueShift = -0.8;
      this.scene.skyAtmosphere.saturationShift = -0.7;
      this.scene.skyAtmosphere.brightnessShift = -0.33;
      
      this.scene.fog.density = 0.001;
      this.scene.fog.minimumBrightness = 0.8;
    }
    
    this.animationViewModel.playForwardViewModel.command();
    this.clock.shouldAnimate = true;
  }
  
  stop() {
    this.clock.shouldAnimate = false;
    this.animationViewModel.pauseViewModel.command();
    this.snowSystem.show = false;
    this.rainSystem.show = false;
    
    // reset scene
    this.scene.skyAtmosphere.hueShift = 0.0;
    this.scene.skyAtmosphere.saturationShift = 0.0;
    this.scene.skyAtmosphere.brightnessShift = 0.0;
    this.scene.fog.density = 2.0e-4;
    this.scene.fog.minimumBrightness = 0.1;
  }
  
  updateLocation() {
    this.staticHeight(this.scene.camera.position, this.cloudHeight);
    this.snowSystem.modelMatrix = Cesium.Matrix4.setTranslation(modelMatrix, this.position, modelMatrix);
    this.rainSystem.modelMatrix = Cesium.Matrix4.setTranslation(modelMatrix, this.position, modelMatrix);
  }
}
