# Market context

Three sourced data points framing why operator UX for stateful Kubernetes services matters. These are the best public figures found; the most specific survey data available is from 2022, which is noted rather than smoothed over.

1. **76% of organizations running stateful workloads on Kubernetes run databases on it**, the single most common stateful workload type (ahead of analytics at 67% and AI/ML at 50%).
   Source: *State of Data on Kubernetes 2022*, Data on Kubernetes Community (DoKC) / ClearPath Strategies, ~500 IT professionals surveyed. [Summary via D2iQ](https://d2iq.com/blog/data-kubernetes-2022-survey)

2. **"Lack of integration with existing tools" was the top-cited challenge (35%) to running stateful workloads on Kubernetes**, ahead of a shortage of skilled staff and the time/effort of ongoing management.
   Source: same DoKC survey family. [Coverage via Cloud Native Now](https://cloudnativenow.com/topics/container-ecosystems/dokc-report-sees-stateful-app-surge-on-kubernetes/)

3. **The operator pattern itself exists specifically because Kubernetes' built-in primitives don't cover stateful concerns** like replication, failover, and backup on their own; ECK is Elastic's 2019 implementation of that pattern for Elasticsearch.
   Source: [CNCF Operator White Paper (2021)](https://www.cncf.io/wp-content/uploads/2021/07/CNCF_Operator_WhitePaper.pdf); [Elastic's 2019 ECK announcement](https://www.elastic.co/blog/introducing-elastic-cloud-on-kubernetes-the-elasticsearch-operator-and-beyond)

**Gap I could not fill**: no current (2025/2026) survey quantifying how many Elasticsearch deployments specifically run via ECK, or operator-specific satisfaction scores. If this matters for the actual presentation, it's worth checking Elastic's own more recent material or a fresh CNCF survey before presenting these numbers as current.
