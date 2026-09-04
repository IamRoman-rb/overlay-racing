// src/scripts/votingHtml.cjs

function getVotingHtml(drivers, campeonato) {
  if (!drivers || drivers.length === 0) {
    return '<h2 style="color:white;text-align:center;font-family:Arial;margin-top:50px;">Votación no iniciada</h2>';
  }

  const safeCampeonato = campeonato || 'CARRERA';

  return `
    <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Votar Piloto</title>
    <style>
      body { background: #121212; color: #fff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px 15px; margin: 0; }
      
      /* Cabecera Liviana */
      .header { text-align: center; margin-bottom: 20px; background: #050505; padding: 15px; border-radius: 8px; border-bottom: 3px solid #e74c3c; box-shadow: 0 4px 15px rgba(0,0,0,0.8); }
      .campeonato { font-size: 16px; color: #ddd; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; }
      h2 { color: #f39c12; text-align: center; text-transform: uppercase; border-bottom: 2px solid #e74c3c; padding-bottom: 10px; margin-top: 10px; font-size: 22px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); }
      
      /* Lista de Pilotos */
      .driver { background: #1a1a1a; margin-bottom: 12px; padding: 12px 15px; border-radius: 8px; border-left: 5px solid #e74c3c; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); transition: transform 0.2s; }
      .driver:active { transform: scale(0.98); }
      .driver-info { display: flex; align-items: center; gap: 12px; font-size: 16px; }
      .driver-num { background: #e74c3c; color: #fff; padding: 4px 8px; border-radius: 4px; font-weight: 900; font-size: 16px; min-width: 25px; text-align: center; box-shadow: 2px 2px 5px rgba(0,0,0,0.4); }
      .driver-name { font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
      .btn { background: #e74c3c; color: #fff; border: none; padding: 10px 18px; border-radius: 6px; font-weight: 900; cursor: pointer; text-transform: uppercase; transition: background 0.3s; font-size: 13px; }
      .btn:active { background: #c0392b; }
      
      /* Pantalla Final */
      #thanks { display: none; text-align: center; margin-top: 40px; padding: 40px 20px; background: linear-gradient(145deg, #1a1a1a, #0a0a0a); border-radius: 12px; border-top: 5px solid #2ecc71; box-shadow: 0 15px 30px rgba(0,0,0,0.8); }
      .thanks-icon { font-size: 60px; margin-bottom: 15px; filter: drop-shadow(0 5px 5px rgba(0,0,0,0.5)); }
      .thanks-title { font-size: 26px; color: #2ecc71; font-weight: 900; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; }
      .thanks-text { font-size: 16px; color: #eee; line-height: 1.6; }
      .highlight { color: #f39c12; font-weight: bold; font-size: 18px; display: block; margin-top: 15px; margin-bottom: 15px; }
      .thanks-footer { margin-top: 25px; font-size: 12px; color: #666; font-style: italic; }
    </style></head>
    <body>
      
      <div class="header">
        <div class="campeonato">${safeCampeonato}</div>
      </div>
      
      <div id="poll">
        <h2>PILOTO DEL DÍA</h2>
        ${drivers.map(d => `
          <div class="driver">
            <div class="driver-info">
              <span class="driver-num">${d.number}</span>
              <span class="driver-name">${d.name}</span>
            </div>
            <button class="btn" onclick="vote('${d.number}', this)">VOTAR</button>
          </div>
        `).join('')}
      </div>

      <div id="thanks">
        <div class="thanks-icon">🏁</div>
        <div class="thanks-title">¡Voto Registrado!</div>
        <div class="thanks-text">
          Tu elección ha sido procesada con éxito.
          <span class="highlight">¡Seguí mirando la transmisión<br>EN VIVO! 📺</span>
          El resultado final del <b>"Piloto del Día"</b> se anunciará en pantalla en instantes.
        </div>
        <div class="thanks-footer">Ya puedes cerrar esta ventana con seguridad.</div>
      </div>
      
      <script>
        function vote(num, btn) {
          btn.innerHTML = '⏳';
          btn.style.opacity = '0.7';
          btn.disabled = true;
          
          fetch('/vote?num=' + encodeURIComponent(num), { method: 'POST' }).then(() => {
            document.getElementById('poll').style.display = 'none';
            document.getElementById('thanks').style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }).catch(() => {
            btn.innerHTML = 'ERROR';
            btn.disabled = false;
            btn.style.opacity = '1';
          });
        }
      </script>
    </body></html>
  `;
}

module.exports = { getVotingHtml };