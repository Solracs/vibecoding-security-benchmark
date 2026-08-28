# Abstract

The adoption of generative AI in software development is by now nearly
universal, while trust in the correctness of its output remains a minority
position. This work approaches that gap from the security side: it proposes,
builds and validates a benchmark that compares, against one and the same
functional specification, the code different language models produce and the
vulnerabilities they introduce.

The central methodological contribution is to delegate security to the business
logic rather than to the framework. A web e-commerce application was developed in
which routing, sessions, persistence and views stay fixed, while the
authentication, shopping-cart and profile modules are swapped at runtime for the
implementation each model generated. By holding everything else constant, each
model's contribution is isolated and the implementations become comparable line
by line.

On that testbed a battery of nine attacks was executed — SQL injection, broken
access control, cross-site scripting, path traversal, dangerous file upload,
business-logic abuse and a race condition — mapped against the OWASP Top 10 and
the CWE catalogue, first manually with an intercepting proxy and afterwards
through an automated instrument that carries its own validation.

The work further includes a round-based remediation experiment in which each
model receives security guidance of increasing specificity. The results show
that a generic instruction produces a real but narrow effect, and that a specific
vulnerability report fixes practically everything it enumerates. The main
finding, however, points the other way: one of the rounds reached a nearly
perfect security matrix by destroying the functionality that contained the
defect — an outcome indistinguishable from success for any metric that only
counts vulnerabilities. Seven guidelines for AI-assisted development are derived
from this analysis, headed by the requirement that every automatically generated
security fix be accompanied by a functional regression test.

**Keywords:** web application security, language models, AI-generated code, vibe
coding, security benchmarking, OWASP Top 10, CWE.
