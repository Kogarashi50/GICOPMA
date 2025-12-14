# SQL Queries for Projet Partenaire Table

## Overview
To match the Convention partner handling logic, we need to create a `projet_partenaire` table similar to `convention_partenaire`. This will allow projects to have the same rich partner engagement features as conventions (engagement types, yearly breakdowns, signature details, etc.).

## SQL Queries

### 1. Create `projet_partenaire` table

```sql
CREATE TABLE `projet_partenaire` (
    `Id_PP` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `projet_id` INT UNSIGNED NOT NULL,
    `Id_Partenaire` INT UNSIGNED NOT NULL,
    `engagement_type_id` INT UNSIGNED NULL,
    `Montant_Convenu` DECIMAL(15, 2) NULL,
    `autre_engagement` TEXT NULL,
    `engagement_description` TEXT NULL,
    `is_signatory` BOOLEAN DEFAULT FALSE,
    `date_signature` DATE NULL,
    `details_signature` TEXT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`Id_PP`),
    INDEX `idx_projet_partenaire_projet` (`projet_id`),
    INDEX `idx_projet_partenaire_partenaire` (`Id_Partenaire`),
    INDEX `idx_projet_partenaire_engagement_type` (`engagement_type_id`),
    CONSTRAINT `fk_projet_partenaire_projet` 
        FOREIGN KEY (`projet_id`) 
        REFERENCES `projet` (`ID_Projet`) 
        ON DELETE CASCADE,
    CONSTRAINT `fk_projet_partenaire_partenaire` 
        FOREIGN KEY (`Id_Partenaire`) 
        REFERENCES `partenaire` (`Id`) 
        ON DELETE CASCADE,
    CONSTRAINT `fk_projet_partenaire_engagement_type` 
        FOREIGN KEY (`engagement_type_id`) 
        REFERENCES `engagement_types` (`id`) 
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2. Create `projet_engagements_annuels` table (for yearly breakdowns)

```sql
CREATE TABLE `projet_engagements_annuels` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_pp` INT UNSIGNED NOT NULL,
    `annee` YEAR NOT NULL,
    `montant_prevu` DECIMAL(15, 2) NOT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_projet_engagements_annuels_pp` (`id_pp`),
    CONSTRAINT `fk_projet_engagements_annuels_pp` 
        FOREIGN KEY (`id_pp`) 
        REFERENCES `projet_partenaire` (`Id_PP`) 
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3. Optional: Migrate existing data from `engagements_financiers` to `projet_partenaire`

**Note:** This is optional and should be done carefully. The old `engagements_financiers` table can be kept for historical data or removed after migration.

```sql
-- Migrate existing engagements_financiers to projet_partenaire
-- This assumes you want to convert existing simple engagements to the new structure
INSERT INTO `projet_partenaire` (
    `projet_id`,
    `Id_Partenaire`,
    `engagement_type_id`,
    `Montant_Convenu`,
    `engagement_description`,
    `is_signatory`,
    `created_at`,
    `updated_at`
)
SELECT 
    ef.`projet_id`,
    ef.`partenaire_id` AS `Id_Partenaire`,
    (SELECT id FROM engagement_types WHERE label LIKE '%financier%' LIMIT 1) AS `engagement_type_id`,
    ef.`montant_engage` AS `Montant_Convenu`,
    ef.`commentaire` AS `engagement_description`,
    FALSE AS `is_signatory`,
    NOW() AS `created_at`,
    NOW() AS `updated_at`
FROM `engagements_financiers` ef
WHERE NOT EXISTS (
    SELECT 1 FROM `projet_partenaire` pp 
    WHERE pp.`projet_id` = ef.`projet_id` 
    AND pp.`Id_Partenaire` = ef.`partenaire_id`
);
```

### 4. Optional: Create index for better performance

```sql
-- Additional index for common queries
CREATE INDEX `idx_projet_partenaire_composite` ON `projet_partenaire` (`projet_id`, `Id_Partenaire`);
```

## Notes

1. **Primary Key:** `Id_PP` follows the same naming convention as `Id_CP` in `convention_partenaire`
2. **Foreign Keys:** All foreign keys use CASCADE delete to maintain referential integrity
3. **Nullable Fields:** `Montant_Convenu` and `autre_engagement` are nullable because a partner can have either a financial commitment OR another type of engagement
4. **Engagement Types:** The `engagement_type_id` references the `engagement_types` table (same as conventions)
5. **Yearly Breakdowns:** The `projet_engagements_annuels` table stores yearly financial breakdowns, similar to `engagements_annuels` for conventions

## Backend Model Requirements

After running these SQL queries, you'll need to:

1. Create a `ProjetPartenaire` model (similar to `ConvPart`)
2. Create a `ProjetEngagementAnnuel` model (similar to `EngagementAnnuel`)
3. Update the `Projet` model to include the relationship:
   ```php
   public function partnerCommitments()
   {
       return $this->hasMany(ProjetPartenaire::class, 'projet_id', 'ID_Projet');
   }
   ```
4. Update `ProjetController` to handle `partner_commitments` in the same way `ConventionController` handles them

## Rollback (if needed)

If you need to rollback these changes:

```sql
DROP TABLE IF EXISTS `projet_engagements_annuels`;
DROP TABLE IF EXISTS `projet_partenaire`;
```


