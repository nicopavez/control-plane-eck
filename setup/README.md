# setup/

Run these three scripts in order, on your own machine (this needs Docker Desktop +
minikube + kubectl; see the root README for install links). They can't run inside
a cloud container — there's no Docker daemon there.

```
./setup/minikube-cluster.sh   # starts a local cluster
./setup/install-eck.sh        # installs the ECK operator
./setup/deploy-minimal-es.sh  # deploys a minimal Elasticsearch cluster
```

Each step is timed and logged to `setup/metrics.json` (committed — this is the real
evidence Task 1's writeup and `site/`'s charts are built from) and
`setup/install.raw.log` (gitignored, full unscrubbed output, useful for debugging
locally but never committed). If a step fails, the script captures operator logs /
`kubectl get events` automatically so you don't have to reproduce the failure by
hand to write it up.

After a successful run:

```
npm run render-charts        # setup/metrics.json -> docs/assets/*.svg
```

Then fill in `docs/task1-install-analysis.md` with your real observations, and copy
`setup/metrics.json` to `site/data/install-metrics.json` so the presentation site
shows real data instead of its sample banner.

To tear the cluster down when you're done: `minikube delete`.
