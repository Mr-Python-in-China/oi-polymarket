FROM postgres:18-trixie

RUN apt-get update \
    && apt-get install -y postgresql-18-cron \
    && rm -rf /var/lib/apt/lists/*

CMD ["postgres", "-c", "shared_preload_libraries=pg_cron", "-c", "cron.database_name=oi-polymarket", "-c", "cron.timezone=UTC"]