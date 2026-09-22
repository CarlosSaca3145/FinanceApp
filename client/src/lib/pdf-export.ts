export function generatePDFReport(reportData: any, periodTitle: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Informe de Patrocinios - Saca Tech - ${periodTitle}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; padding: 30px; line-height: 1.5; background: #ffffff; }
          .header { border-bottom: 3px solid #6366f1; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
          .title { font-size: 24px; font-weight: 800; color: #4338ca; margin: 0; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; }
          .kpi-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; tracking: 0.5px; }
          .kpi-value { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 15px; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px; color: #334155; display: flex; justify-content: space-between; align-items: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-weight: 700; color: #475569; border-bottom: 2px solid #cbd5e1; }
          td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
          .badge { padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; display: inline-block; }
          .badge-paid { background: #dcfce7; color: #15803d; }
          .badge-pending { background: #fef3c7; color: #b45309; }
          .footer { margin-top: 40px; font-size: 11px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="background: #4338ca; color: white; border: none; padding: 10px 22px; font-weight: bold; border-radius: 8px; cursor: pointer; font-size: 13px; shadow: 0 2px 4px rgba(0,0,0,0.1);">
            📄 Imprimir / Guardar como PDF
          </button>
        </div>

        <div class="header">
          <div>
            <h1 class="title">Saca Tech — Informe de Patrocinios</h1>
            <p class="subtitle">Reporte Ejecutivo del Departamento (${periodTitle}) | Fecha: ${new Date().toLocaleDateString('es-ES')}</p>
          </div>
          <div style="text-align: right;">
            <strong style="color: #4338ca; font-size: 18px;">@saca.technology</strong>
          </div>
        </div>

        <!-- KPI Grid -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Emails Enviados</div>
            <div class="kpi-value">${reportData.emailsSent || 0}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Respuestas Recibidas</div>
            <div class="kpi-value">${reportData.repliesReceived || 0}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Acordado ($)</div>
            <div class="kpi-value" style="color: #15803d;">$${(reportData.totalCashClosed || 0).toLocaleString()}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Valor Canjes ($)</div>
            <div class="kpi-value" style="color: #7c3aed;">$${(reportData.totalCommercialBarter || 0).toLocaleString()}</div>
          </div>
        </div>

        <!-- Deals & Deliverables Table -->
        <div class="section">
          <h2 class="section-title">
            <span>💼 Acuerdos y Patrocinios Registrados</span>
            <span style="font-size: 12px; font-weight: normal; color: #64748b;">${(reportData.dealsList || []).length} patrocinio(s)</span>
          </h2>
          <table>
            <thead>
              <tr>
                <th>Marca</th>
                <th>Concepto / Entregable</th>
                <th>Precio ($)</th>
                <th>Fecha Entrega</th>
                <th>Estado Entrega</th>
                <th>Estado Pago</th>
              </tr>
            </thead>
            <tbody>
              ${(reportData.dealsList || []).map((d: any) => `
                <tr>
                  <td><strong>${d.brandName}</strong></td>
                  <td>${d.dealName || d.videoTitle || 'Patrocinio'}</td>
                  <td><strong>$${(d.agreedAmount || 0).toLocaleString()}</strong></td>
                  <td>${d.deliveryDate ? new Date(d.deliveryDate).toLocaleDateString('es-ES') : 'TBD'}</td>
                  <td>${d.deliveryStatus === 'delivered' ? '✅ Entregado' : '⏳ Pendiente'}</td>
                  <td><span class="badge ${d.paymentStatus === 'paid' ? 'badge-paid' : 'badge-pending'}">${d.paymentStatus === 'paid' ? '✅ Pagado' : '⏳ Pendiente'}</span></td>
                </tr>
              `).join('') || '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">No hay acuerdos registrados en este período</td></tr>'}
            </tbody>
          </table>
        </div>

        <!-- Barter Resale Products Table -->
        <div class="section">
          <h2 class="section-title">
            <span>🛍️ Registro de Canjes y Venta de Productos</span>
            <span style="font-size: 12px; font-weight: normal; color: #64748b;">Ventas registradas: $${(reportData.totalBarterSold || 0).toLocaleString()}</span>
          </h2>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Marca</th>
                <th>Valor Comercial (MSRP)</th>
                <th>Precio Vendido ($)</th>
                <th>Estado Inventario</th>
              </tr>
            </thead>
            <tbody>
              ${(reportData.barterList || []).map((p: any) => `
                <tr>
                  <td><strong>${p.productName}</strong></td>
                  <td>${p.brandName}</td>
                  <td>$${(p.commercialValue || 0).toLocaleString()}</td>
                  <td><strong style="color: #15803d;">$${(p.soldPrice || 0).toLocaleString()}</strong></td>
                  <td>${p.saleStatus === 'sold' ? '✅ Vendido' : '📦 En Inventario'}</td>
                </tr>
              `).join('') || '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No hay productos de canje registrados</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>Informe confidencial generado automáticamente por el departamento de patrocinios de Saca Tech.</p>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
