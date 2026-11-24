// A fixed atlas illustration. Draw once so the title screen stays idle.
export function drawSpecimen(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);
  ctx.translate(180, 124);
  const stroke = (points, color, width) => {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };
  const face = (points, light, shade = light) => {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    const surface = ctx.createLinearGradient(-35, -90, 43, 44);
    surface.addColorStop(0, light);
    surface.addColorStop(1, shade);
    ctx.fillStyle = surface;
    ctx.fill();
    ctx.lineWidth = 0.9;
    ctx.strokeStyle = "#ffefcf8c";
    ctx.stroke();
  };
  const glow = ctx.createRadialGradient(0, 0, 12, 0, 0, 126);
  glow.addColorStop(0, "#3c6465");
  glow.addColorStop(0.72, "#184648");
  glow.addColorStop(1, "#0c262c00");
  ctx.fillStyle = glow;
  ctx.fillRect(-136, -130, 272, 264);
  const aura = ctx.createRadialGradient(-24, -48, 9, -15, -22, 100);
  aura.addColorStop(0, "#ffb15d40");
  aura.addColorStop(0.55, "#ffc38114");
  aura.addColorStop(1, "#ffc38100");
  ctx.fillStyle = aura;
  ctx.fillRect(-128, -124, 256, 230);
  for (let i = 0; i < 56; i++) {
    const angle = i * 2.399963;
    const radius = 34 + (i * 37 % 95);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    ctx.fillStyle = i % 4 === 0 ? "#ffda9899" : "#9af8db70";
    ctx.beginPath();
    ctx.arc(x, y, i % 7 === 0 ? 1.3 : 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const radius of [79, 89, 105, 111]) {
    ctx.beginPath();
    ctx.setLineDash(radius === 105 ? [1, 6] : []);
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.lineWidth = radius === 105 ? 4 : 1;
    ctx.strokeStyle = radius === 79 ? "#82d7c532" : "#82d7c565";
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const sign of [-1, 1]) {
    stroke([[sign * 96, 0], [sign * 132, 0]], "#83daca99", 1);
    stroke([[0, sign * 96], [0, sign * 119]], "#83daca99", 1);
  }
  ctx.rotate(-0.34);
  const top = [0,-90], left = [-39,-64], right = [40,-67], mid = [3,-47];
  const lowL = [-31,-25], lowR = [34,-27], base = [3,-13];
  face([top,left,mid], "#ffd497", "#cf7756");
  face([top,mid,right], "#fff1c0", "#e98966");
  face([left,lowL,mid], "#bf806b", "#542b4a");
  face([mid,lowL,base], "#e99b7b", "#8b4e5d");
  face([mid,base,lowR], "#bd797f", "#4e304f");
  face([right,mid,lowR], "#fcbfa0", "#995771");
  stroke([[-39,-64],[0,-90],[40,-67]], "#ffecc4", 1.65);
  stroke([[-20,-52],[3,-47],[21,-55]], "#ffc789", 1.15);
  for (let y = -12; y < 36; y += 7) {
    face([[-8,y],[7,y-2],[9,y+2],[-6,y+5]], "#77b5a8");
  }
  face([[-15,39],[-7,32],[9,32],[17,39],[5,44],[-7,44]], "#bdded0");
  for (const sign of [-1, 1]) {
    for (const [knee, foot, end] of [[59,84,65],[36,46,95],[17,9,82]]) {
      const leg = [[sign * 8,39],[sign * knee,24],[sign * foot,end],[sign * (foot+6),end+2]];
      stroke(leg, "#102528", 4);
      stroke(leg, "#c8c7a3", 1.75);
      for (const [x, y] of leg.slice(1, 3)) {
        ctx.beginPath();
        ctx.arc(x, y, 1.25, 0, Math.PI * 2);
        ctx.fillStyle = "#ffdda3";
        ctx.fill();
      }
    }
  }
}

export function routeThumbnail(routes, color) {
  const canvas = document.createElement("canvas");
  canvas.className = "sector-route";
  canvas.width = 240;
  canvas.height = 100;
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d");
  for (let lane = routes.length - 1; lane >= 0; lane--) {
    const points = routes[lane].points.map(([x,y]) => [10 + x * 220 / 900, 4 + y * 92 / 540]);
    ctx.strokeStyle = lane ? "#9d8bbf" : color;
    ctx.setLineDash(lane ? [5,4] : []);
    ctx.lineWidth = lane ? 2.2 : 3.6;
    ctx.beginPath();
    points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
    ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;
    const [x,y] = points.at(-1);
    ctx.fillRect(x-3,y-3,6,6);
  }
  return canvas;
}
