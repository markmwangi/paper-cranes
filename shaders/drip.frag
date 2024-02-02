
// Swirl and wave parameters

// Swirl function
vec2 swirl(vec2 p){
  float swirlIntensity=spectralSpreadNormalized*.5;
  
  float angle=atan(p.y,p.x);
  float radius=length(p);
  angle+=swirlIntensity*sin(radius*10.+time);
  return radius*vec2(cos(angle),sin(angle));
}

// Wave function
vec2 wave(vec2 p){
  float waveFrequency=spectralCentroidNormalized*10.;
  float waveAmplitude=spectralFluxNormalized*.2;
  return p+vec2(sin(p.x*waveFrequency+time),cos(p.y*waveFrequency+time))*waveAmplitude;
}

// Fractal parameters
float fractalIterations=8.;
float fractalScale=1.5;

// Fractal function
vec2 fractal(vec2 p){
  // Mandelbrot or other fractal pattern
  // Example:
  vec2 z=vec2(0.);
  for(int i=0;i<int(fractalIterations);i++){
    z=vec2(z.x*z.x-z.y*z.y,2.*z.x*z.y)+p;
    if(dot(z,z)>4.)break;
  }
  return z;
}

// Drip effect
float drip(vec2 p){
  // Drip effect (using spectralFluxNormalized for speed and spectralSkewNormalized for length)
  float dripSpeed=spectralFluxNormalized*.5+.1;
  float dripLength=spectralSkewNormalized*.8+.2;
  float dripIntensity=.5;// Keep this fixed for now
  vec2 d=p-vec2(.5);
  return sin(length(d)*dripSpeed+time)*dripIntensity*smoothstep(0.,dripLength,length(d));
}

vec3[5]getPalette(vec2 uv){
  // Example palette
  // Color palette
  vec3 palette[5]=vec3[5](
    vec3(0.,0.,0.),
    vec3(0.,0.,1.),
    vec3(0.,1.,0.),
    vec3(1.,0.,0.),
    vec3(.0314,0.,1.)
  );
  return palette;
}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
  vec2 uv=fragCoord.xy/resolution.xy;
  vec3 palette[5]=getPalette(uv);
  // rotate uv over time:
  uv-=.5;
  float pivot=time;
  //roate differently based on where on the screen the current pixel is.
  pivot+=uv.x*2.;
  pivot+=uv.y*2.;
  uv*=mat2(cos(pivot),-sin(pivot),sin(pivot),cos(pivot));
  uv+=.5;
  
  // Combine fractal and drip effects
  vec2 f=fractal(uv);// Calculate fractal first for smoother distortion
  vec2 w=swirl(wave(f));
  float d=drip(w);
  vec2 offset=w*fractalScale+vec2(d,d);
  
  // Map music features to color
  vec3 color=vec3(0.);
  color.r=spectralCentroidNormalized;// Example mapping
  color.g=spectralRolloffNormalized;// Example mapping
  color.b=energyNormalized;// Example mapping
  
  // Adjust color based on drip and fractal
  color=mix(color,rgb2hsl(color),offset.x);
  color=mix(color,hsl2rgb(vec3(color.r,color.g+offset.y,color.b)),offset.y);
  
  // Apply color palette
  color=mix(palette[0],palette[4],color.r);
  vec3 last=getLastFrameColor(uv).rgb;
  color=mix(color,last,.5);
  fragColor=vec4(color,1.);
}
