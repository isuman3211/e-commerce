<?php
// logout.php
require_once 'config/config.php';

logoutUser();

// Redirect to home
header("Location: index.html");
exit;
?>