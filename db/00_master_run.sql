/*==============================================================================
  ECRAS DA2 — Master Run Script
  Executes all components in dependency order.
==============================================================================*/

SET SERVEROUTPUT ON;

@01_schema_ddl.sql
@02_seed_data.sql
@03_business_rule_triggers.sql
@04_pkg_recruitment.sql
@05_pkg_interview.sql
@06_pkg_governance.sql
@07_queries_views_demo.sql
