<?php
/**
 * Operations module data cleanup.
 *
 * Removes all transaction/demo records from the Operations module:
 * customers, tables, reservations, orders, order_items, KOT tickets,
 * payments, invoices, refunds, order_status_history, order_item_modifiers,
 * kot_ticket_items, waitlist.
 *
 * Preserves: users, roles, permissions, menu data, ingredients, recipes,
 * suppliers, purchase orders, stock movements, outlets, settings, audit logs.
 *
 * Uses a transaction and temporarily disables FK checks for safety.
 */

require 'vendor/autoload.php';

$pdo = new PDO(
    'pgsql:host=127.0.0.1;port=5432;dbname=rms_database',
    'postgres',
    'admin'
);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Tables to truncate (in child-first order, though FK checks are off)
$operationTables = [
    'kot_ticket_items',
    'kot_tickets',
    'order_item_modifiers',
    'order_status_history',
    'order_items',
    'orders',
    'payments',
    'invoices',
    'refunds',
    'reservations',
    'waitlist',
    'customers',
    'tables',
];

$pdo->beginTransaction();

try {
    // Disable FK checks temporarily
    $pdo->exec('SET session_replication_role = replica');

    $deletedCounts = [];
    foreach ($operationTables as $table) {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM $table");
        $stmt->execute();
        $before = (int) $stmt->fetchColumn();

        $pdo->exec("DELETE FROM $table");

        $deletedCounts[$table] = $before;
    }

    // Re-enable FK checks
    $pdo->exec('SET session_replication_role = origin');

    $pdo->commit();

    echo "=== OPERATIONS DATA CLEANUP — DELETED RECORDS ===\n";
    echo str_pad('TABLE', 30) . "DELETED\n";
    echo str_repeat('-', 45) . "\n";
    $total = 0;
    foreach ($deletedCounts as $table => $count) {
        echo str_pad($table, 30) . $count . "\n";
        $total += $count;
    }
    echo str_repeat('-', 45) . "\n";
    echo str_pad('TOTAL', 30) . $total . "\n";

    // Verify counts are now 0
    echo "\n=== POST-CLEANUP VERIFICATION ===\n";
    foreach ($operationTables as $table) {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM $table");
        $stmt->execute();
        $count = (int) $stmt->fetchColumn();
        $status = $count === 0 ? 'OK' : 'STILL_HAS_DATA';
        echo str_pad($table, 30) . $count . " [$status]\n";
    }

    echo "\nCleanup completed successfully.\n";
} catch (Exception $e) {
    $pdo->rollBack();
    $pdo->exec('SET session_replication_role = origin');
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "Transaction rolled back.\n";
    exit(1);
}
