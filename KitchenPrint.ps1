Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class RawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public class DOCINFO { public string pDocName; public string pOutputFile; public string pDataType; }
  [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)] public static extern bool OpenPrinter(string n, out IntPtr h, IntPtr p);
  [DllImport("winspool.drv", SetLastError=true)] public static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)] public static extern int StartDocPrinter(IntPtr h,int l,[In] DOCINFO d);
  [DllImport("winspool.drv", SetLastError=true)] public static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError=true)] public static extern int StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError=true)] public static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError=true)] public static extern bool WritePrinter(IntPtr h,IntPtr p,int c,out int w);
  public static bool Send(string n, byte[] b) { IntPtr h; if(!OpenPrinter(n,out h,IntPtr.Zero)) return false; try { var d=new DOCINFO{pDocName="KPrint",pDataType="RAW"}; if(StartDocPrinter(h,1,d)==0)return false; StartPagePrinter(h); IntPtr p=Marshal.AllocHGlobal(b.Length); Marshal.Copy(b,0,p,b.Length); int w; bool ok=WritePrinter(h,p,b.Length,out w); Marshal.FreeHGlobal(p); EndPagePrinter(h); EndDocPrinter(h); return ok&&w==b.Length; } finally { ClosePrinter(h); } }
}
"@

$dark=[Drawing.ColorTranslator]::FromHtml('#182230'); $orange=[Drawing.ColorTranslator]::FromHtml('#ED6A2D'); $ink=[Drawing.ColorTranslator]::FromHtml('#344054'); $muted=[Drawing.ColorTranslator]::FromHtml('#667085')
function Add-Field($parent,$label,$x,$y,$width) {
  $l=New-Object System.Windows.Forms.Label; $l.Text=$label; $l.Location=New-Object Drawing.Point($x,$y); $l.AutoSize=$true; $l.Font=New-Object Drawing.Font('Segoe UI',9,[Drawing.FontStyle]::Bold); $l.ForeColor=$ink; $parent.Controls.Add($l)
  $t=New-Object System.Windows.Forms.TextBox; $t.Location=New-Object Drawing.Point($x,($y+22)); $t.Size=New-Object Drawing.Size($width,31); $t.Font=New-Object Drawing.Font('Segoe UI',10); $t.BackColor=[Drawing.Color]::White; $t.BorderStyle='FixedSingle'; $t.Enabled=$true; $parent.Controls.Add($t); return $t
}

$form=New-Object Windows.Forms.Form; $form.Text='KPrint'; $form.Size=New-Object Drawing.Size(620,790); $form.StartPosition='CenterScreen'; $form.FormBorderStyle='FixedSingle'; $form.MaximizeBox=$false; $form.BackColor=[Drawing.ColorTranslator]::FromHtml('#F4F6FA')
$header=New-Object Windows.Forms.Panel; $header.Location=New-Object Drawing.Point(0,0); $header.Size=New-Object Drawing.Size(604,112); $header.BackColor=$dark; $form.Controls.Add($header)
$title=New-Object Windows.Forms.Label; $title.Text='KPrint'; $title.Font=New-Object Drawing.Font('Segoe UI',27,[Drawing.FontStyle]::Bold); $title.ForeColor=[Drawing.Color]::White; $title.Location=New-Object Drawing.Point(28,16); $title.AutoSize=$true; $header.Controls.Add($title)
$sub=New-Object Windows.Forms.Label; $sub.Text='Pedido com pratos e bebidas'; $sub.Font=New-Object Drawing.Font('Segoe UI',11,[Drawing.FontStyle]::Bold); $sub.ForeColor=[Drawing.ColorTranslator]::FromHtml('#B9C5D6'); $sub.Location=New-Object Drawing.Point(31,65); $sub.AutoSize=$true; $header.Controls.Add($sub)
$mesa=Add-Field $form 'Mesa' 32 138 120
$typeLabel=New-Object Windows.Forms.Label; $typeLabel.Text='Tipo'; $typeLabel.Location=New-Object Drawing.Point(172,138); $typeLabel.AutoSize=$true; $typeLabel.Font=New-Object Drawing.Font('Segoe UI',10,[Drawing.FontStyle]::Bold); $typeLabel.ForeColor=$ink; $form.Controls.Add($typeLabel)
$type=New-Object Windows.Forms.ComboBox; $type.Location=New-Object Drawing.Point(172,160); $type.Size=New-Object Drawing.Size(130,32); $type.Font=New-Object Drawing.Font('Segoe UI',11,[Drawing.FontStyle]::Bold); $type.DropDownStyle='DropDownList'; [void]$type.Items.Add('Prato'); [void]$type.Items.Add('Bebida'); $type.SelectedIndex=0; $form.Controls.Add($type)
$food=Add-Field $form 'Item' 322 138 250
$ql=New-Object Windows.Forms.Label; $ql.Text='Quantidade'; $ql.Location=New-Object Drawing.Point(32,213); $ql.AutoSize=$true; $ql.Font=New-Object Drawing.Font('Segoe UI',10,[Drawing.FontStyle]::Bold); $ql.ForeColor=$ink; $form.Controls.Add($ql)
$qty=New-Object Windows.Forms.NumericUpDown; $qty.Location=New-Object Drawing.Point(32,235); $qty.Size=New-Object Drawing.Size(120,32); $qty.Font=New-Object Drawing.Font('Segoe UI',12,[Drawing.FontStyle]::Bold); $qty.Minimum=1; $qty.Maximum=99; $qty.Value=1; $form.Controls.Add($qty)
$sl=New-Object Windows.Forms.Label; $sl.Text='Especificacao deste item'; $sl.Location=New-Object Drawing.Point(172,213); $sl.AutoSize=$true; $sl.Font=New-Object Drawing.Font('Segoe UI',10,[Drawing.FontStyle]::Bold); $sl.ForeColor=$ink; $form.Controls.Add($sl)
$spec=New-Object Windows.Forms.TextBox; $spec.Location=New-Object Drawing.Point(172,235); $spec.Size=New-Object Drawing.Size(400,32); $spec.Font=New-Object Drawing.Font('Segoe UI',11); $spec.BackColor=[Drawing.Color]::White; $spec.BorderStyle='FixedSingle'; $form.Controls.Add($spec)
$add=New-Object Windows.Forms.Button; $add.Text='+ ADICIONAR ITEM'; $add.Location=New-Object Drawing.Point(32,285); $add.Size=New-Object Drawing.Size(540,44); $add.Font=New-Object Drawing.Font('Segoe UI',11,[Drawing.FontStyle]::Bold); $add.ForeColor=[Drawing.Color]::White; $add.BackColor=$orange; $add.FlatStyle='Flat'; $add.FlatAppearance.BorderSize=0; $form.Controls.Add($add)
$items=New-Object Collections.ArrayList
$list=New-Object Windows.Forms.ListBox; $list.Location=New-Object Drawing.Point(32,350); $list.Size=New-Object Drawing.Size(440,145); $list.Font=New-Object Drawing.Font('Segoe UI',11,[Drawing.FontStyle]::Bold); $list.BackColor=[Drawing.Color]::White; $form.Controls.Add($list)
$remove=New-Object Windows.Forms.Button; $remove.Text='Remover selecionado'; $remove.Location=New-Object Drawing.Point(482,350); $remove.Size=New-Object Drawing.Size(90,52); $remove.Font=New-Object Drawing.Font('Segoe UI',8,[Drawing.FontStyle]::Bold); $remove.BackColor=[Drawing.Color]::White; $remove.FlatStyle='Flat'; $form.Controls.Add($remove)
$add.Add_Click({ if([string]::IsNullOrWhiteSpace($food.Text)){[Windows.Forms.MessageBox]::Show('Informe o nome do item.','Item incompleto');return}; $obj=[pscustomobject]@{Type=$type.Text;Name=$food.Text.Trim();Qty=$qty.Value;Spec=$spec.Text.Trim()}; [void]$items.Add($obj); [void]$list.Items.Add("$($obj.Qty)x  [$($obj.Type)]  $($obj.Name)"); $food.Clear();$spec.Clear();$qty.Value=1;$food.Focus() })
$remove.Add_Click({ if($list.SelectedIndex -ge 0){$i=$list.SelectedIndex;$list.Items.RemoveAt($i);$items.RemoveAt($i)} })
$printer=(Get-CimInstance Win32_Printer | Where-Object Default | Select-Object -First 1).Name
$pl=New-Object Windows.Forms.Label; $pl.Text="Impressora: $printer  |  2 vias: COZINHA + MESA"; $pl.Location=New-Object Drawing.Point(32,525); $pl.AutoSize=$true; $pl.Font=New-Object Drawing.Font('Segoe UI',9,[Drawing.FontStyle]::Bold); $pl.ForeColor=$muted; $form.Controls.Add($pl)
$button=New-Object Windows.Forms.Button; $button.Text='IMPRIMIR 2 VIAS'; $button.Font=New-Object Drawing.Font('Segoe UI',13,[Drawing.FontStyle]::Bold); $button.ForeColor=[Drawing.Color]::White; $button.BackColor=$dark; $button.FlatStyle='Flat'; $button.FlatAppearance.BorderSize=0; $button.Location=New-Object Drawing.Point(32,570); $button.Size=New-Object Drawing.Size(540,60); $form.Controls.Add($button); $form.AcceptButton=$button
$button.Add_Click({
  if($items.Count -eq 0 -or [string]::IsNullOrWhiteSpace($mesa.Text)){[Windows.Forms.MessageBox]::Show('Informe a mesa e adicione pelo menos um item.','Pedido incompleto');return}
  $enc=[Text.Encoding]::GetEncoding(1252); $line='--------------------------------'; $body=''; foreach($i in $items){$body += "`n$line`n$($i.Qty)x  $($i.Name.ToUpper())`n";if($i.Spec){$body += "OBSERVACOES: $($i.Spec)`n"};$body += "`n"}
  $header="`nPEDIDO`nMESA: $($mesa.Text)`n$line`n"; $bytes=New-Object Collections.Generic.List[byte]
  $bytes.AddRange([byte[]](0x1B,0x40,0x1B,0x61,0x01,0x1B,0x45,0x01,0x1D,0x21,0x11)); $bytes.AddRange($enc.GetBytes("`nCOZINHA`n")); $bytes.AddRange([byte[]](0x1D,0x21,0x11,0x1B,0x61,0x00,0x1B,0x45,0x01)); $bytes.AddRange($enc.GetBytes("$header$body")); $bytes.AddRange([byte[]](0x1B,0x45,0x00,0x0A,0x0A,0x0A,0x1D,0x56,0x00))
  $bytes.AddRange([byte[]](0x1B,0x40,0x1B,0x61,0x01,0x1B,0x45,0x01,0x1D,0x21,0x11)); $bytes.AddRange($enc.GetBytes("`nMESA`n")); $bytes.AddRange([byte[]](0x1D,0x21,0x11,0x1B,0x61,0x00,0x1B,0x45,0x01)); $bytes.AddRange($enc.GetBytes("$header$body")); $bytes.AddRange([byte[]](0x1B,0x45,0x00,0x0A,0x0A,0x0A,0x1D,0x56,0x00));
  $button.Enabled=$false;$ok=[RawPrinter]::Send($printer,$bytes.ToArray());$button.Enabled=$true;if($ok){[Windows.Forms.MessageBox]::Show('2 vias impressas e cortadas.','KPrint')}else{[Windows.Forms.MessageBox]::Show('Nao foi possivel enviar para a impressora.','Erro')}
})
[void]$form.ShowDialog()
