#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { App } from "./App.js";
import { createClient } from "./lib/client.js";

const client = createClient();
render(<App client={client} />);
