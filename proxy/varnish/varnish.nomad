job "varnish" {
  region = "global"
  datacenters = ["dc1"]
  type = "system"
  update {
    stagger = "60s"
    max_parallel = 1
  }
  group "varnish" {
    count = 1
    restart {
      attempts = 10
      interval = "5m"
      delay = "25s"
      mode = "delay"
    }
    task "varnish" {
      driver = "docker"
      config {
        image = "protinam/varnish"
        network_mode = "host"
        port_map {
          "http" = 80
        }
      }
      service {
        name = "varnish"
        tags = []
        port = "http"
        check {
          name = "alive"
          type = "tcp"
          interval = "10s"
          timeout = "2s"
        }
      }
      resources {
        cpu = 1024
        memory = 1024
        network {
          mbits = 10
          port "http" {
            static = 80
          }
        }
      }
    }
  }
} 
