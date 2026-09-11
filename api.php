<?php
declare(strict_types=1);
session_start();
header('Content-Type: application/json; charset=utf-8');

$db = new PDO('sqlite:' . __DIR__ . '/data.sqlite');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$uploadDir = __DIR__ . DIRECTORY_SEPARATOR . 'uploads';
if (!is_dir($uploadDir)) { @mkdir($uploadDir, 0755, true); }

$db->exec("PRAGMA foreign_keys = ON");

$db->exec("CREATE TABLE IF NOT EXISTS services (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 type TEXT NOT NULL,
 phone TEXT NOT NULL,
 whatsapp TEXT,
 facebook TEXT,
 image TEXT,
 details TEXT,
 link TEXT,
 area TEXT DEFAULT '',
 status TEXT NOT NULL DEFAULT 'pending',
 rating_sum INTEGER NOT NULL DEFAULT 0,
 rating_count INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)");
$db->exec("CREATE TABLE IF NOT EXISTS category_requests (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)");
$db->exec("CREATE TABLE IF NOT EXISTS news (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 text TEXT NOT NULL,
 active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)");
$db->exec("CREATE TABLE IF NOT EXISTS ratings (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 service_id INTEGER NOT NULL,
 fingerprint TEXT NOT NULL,
 stars INTEGER NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(service_id, fingerprint),
 FOREIGN KEY(service_id) REFERENCES services(id) ON DELETE CASCADE
)");

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

function body(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '{}', true);
    return is_array($data) ? $data : [];
}
function out($data, int $code=200): never {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
function admin(): bool { return !empty($_SESSION['admin']); }
function requireAdmin(): void { if (!admin()) out(['error'=>'غير مصرح'],401); }

if ($action === 'services' && $method === 'GET') {
    $stmt=$db->query("SELECT *, CASE WHEN rating_count=0 THEN 0 ELSE ROUND(CAST(rating_sum AS REAL)/rating_count,1) END rating FROM services WHERE status='approved' ORDER BY id DESC");
    out($stmt->fetchAll(PDO::FETCH_ASSOC));
}

if ($action === 'add_service' && $method === 'POST') {
    $d=body();
    foreach(['name','type','phone'] as $k) if (trim((string)($d[$k]??''))==='') out(['error'=>"الحقل $k مطلوب"],422);
    $q=$db->prepare("INSERT INTO services(name,type,phone,whatsapp,facebook,image,details,link,area) VALUES(?,?,?,?,?,?,?,?,?)");
    $q->execute([$d['name'],$d['type'],$d['phone'],$d['whatsapp']??'',$d['facebook']??'',$d['image']??'',$d['details']??'',$d['link']??'',$d['area']??'']);
    out(['ok'=>true,'message'=>'تم إرسال الخدمة للمراجعة','id'=>$db->lastInsertId()]);
}

if ($action === 'suggest_category' && $method === 'POST') {
    $d=body(); $name=trim((string)($d['name']??''));
    if($name==='') out(['error'=>'اكتب اسم التخصص'],422);
    $q=$db->prepare("INSERT INTO category_requests(name) VALUES(?)"); $q->execute([$name]);
    out(['ok'=>true,'message'=>'تم إرسال التخصص للمراجعة']);
}

if ($action === 'rate' && $method === 'POST') {
    $d=body(); $id=(int)($d['service_id']??0); $stars=(int)($d['stars']??0);
    if($id<1 || $stars<1 || $stars>5) out(['error'=>'تقييم غير صحيح'],422);
    $fingerprint=hash('sha256',($_SERVER['REMOTE_ADDR']??'').($_SERVER['HTTP_USER_AGENT']??''));
    try {
        $q=$db->prepare("INSERT INTO ratings(service_id,fingerprint,stars) VALUES(?,?,?)");
        $q->execute([$id,$fingerprint,$stars]);
        $q=$db->prepare("UPDATE services SET rating_sum=rating_sum+?, rating_count=rating_count+1 WHERE id=? AND status='approved'");
        $q->execute([$stars,$id]);
        out(['ok'=>true]);
    } catch(Throwable $e) { out(['error'=>'تم تسجيل تقييمك لهذا الشخص من قبل'],409); }
}

if ($action === 'news' && $method === 'GET') {
    $q=$db->query("SELECT text FROM news WHERE active=1 ORDER BY id DESC LIMIT 1");
    out(['text'=>$q->fetchColumn() ?: 'تمت إضافة خدمات جديدة إلى دليل خدماتنا']);
}

if ($action === 'upload_image' && $method === 'POST') {
    if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        out(['error'=>'لم يتم رفع الصورة'],422);
    }
    $file=$_FILES['image'];
    if ($file['size'] > 5*1024*1024) out(['error'=>'حجم الصورة أكبر من 5 ميغابايت'],422);
    $finfo=new finfo(FILEINFO_MIME_TYPE);
    $mime=$finfo->file($file['tmp_name']);
    $allowed=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];
    if (!isset($allowed[$mime])) out(['error'=>'صيغة الصورة غير مدعومة'],422);
    $name=bin2hex(random_bytes(12)).'.'.$allowed[$mime];
    if (!move_uploaded_file($file['tmp_name'],$uploadDir.DIRECTORY_SEPARATOR.$name)) out(['error'=>'تعذر حفظ الصورة'],500);
    out(['ok'=>true,'url'=>'uploads/'.$name]);
}

if ($action === 'admin_login' && $method === 'POST') {
    $d=body();
    $user=getenv('DALIL_ADMIN_USER') ?: 'admin';
    $pass=getenv('DALIL_ADMIN_PASS') ?: 'ChangeMe123!';
    if (($d['username']??'')===$user && ($d['password']??'')===$pass) {
        $_SESSION['admin']=true; out(['ok'=>true]);
    }
    out(['error'=>'بيانات الدخول غير صحيحة'],401);
}
if ($action === 'admin_logout') { session_destroy(); out(['ok'=>true]); }

if ($action === 'admin_stats' && $method === 'GET') {
    requireAdmin();
    $r=[];
    foreach(['pending','approved'] as $s){$q=$db->prepare("SELECT COUNT(*) FROM services WHERE status=?");$q->execute([$s]);$r[$s]=(int)$q->fetchColumn();}
    $r['categories']=(int)$db->query("SELECT COUNT(*) FROM category_requests WHERE status='pending'")->fetchColumn();
    $r['ratings']=(int)$db->query("SELECT COUNT(*) FROM ratings")->fetchColumn();
    out($r);
}
if ($action === 'admin_pending' && $method === 'GET') {
    requireAdmin(); out($db->query("SELECT * FROM services WHERE status='pending' ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC));
}
if ($action === 'admin_approve' && $method === 'POST') {
    requireAdmin(); $id=(int)(body()['id']??0); $q=$db->prepare("UPDATE services SET status='approved' WHERE id=?");$q->execute([$id]);out(['ok'=>true]);
}
if ($action === 'admin_reject' && $method === 'POST') {
    requireAdmin(); $id=(int)(body()['id']??0); $q=$db->prepare("UPDATE services SET status='rejected' WHERE id=?");$q->execute([$id]);out(['ok'=>true]);
}
if ($action === 'admin_edit' && $method === 'POST') {
    requireAdmin();
    $d=body(); $id=(int)($d['id']??0);
    if($id<1) out(['error'=>'خدمة غير صحيحة'],422);
    $q=$db->prepare("UPDATE services SET name=?,type=?,phone=?,whatsapp=?,facebook=?,details=?,link=?,area=? WHERE id=?");
    $q->execute([$d['name']??'', $d['type']??'', $d['phone']??'', $d['whatsapp']??'', $d['facebook']??'', $d['details']??'', $d['link']??'', $d['area']??'', $id]);
    out(['ok'=>true]);
}

if ($action === 'admin_delete' && $method === 'POST') {
    requireAdmin(); $id=(int)(body()['id']??0); $q=$db->prepare("DELETE FROM services WHERE id=?");$q->execute([$id]);out(['ok'=>true]);
}
if ($action === 'admin_categories' && $method === 'GET') {
    requireAdmin(); out($db->query("SELECT * FROM category_requests WHERE status='pending' ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC));
}
if ($action === 'admin_category_approve' && $method === 'POST') {
    requireAdmin(); $id=(int)(body()['id']??0); $q=$db->prepare("UPDATE category_requests SET status='approved' WHERE id=?");$q->execute([$id]);out(['ok'=>true]);
}
if ($action === 'admin_news' && $method === 'GET') {
    requireAdmin(); $q=$db->query("SELECT text FROM news WHERE active=1 ORDER BY id DESC LIMIT 1");out(['text'=>$q->fetchColumn() ?: '']);
}
if ($action === 'admin_news' && $method === 'POST') {
    requireAdmin(); $text=trim((string)(body()['text']??'')); if($text==='')out(['error'=>'اكتب نص الخبر'],422);
    $db->exec("UPDATE news SET active=0");
    $q=$db->prepare("INSERT INTO news(text,active) VALUES(?,1)");$q->execute([$text]);out(['ok'=>true]);
}
out(['error'=>'طلب غير معروف'],404);
?>